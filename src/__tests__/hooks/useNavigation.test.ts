// WS-254: Navigation Hook Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation } from '@/hooks/useNavigation';
import { useRouter, usePathname } from 'next/navigation';

// Mock Next.js navigation
vi.mock('next/navigation');

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

describe('useNavigation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(usePathname).mockReturnValue('/catering/dietary');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Navigation', () => {
    it('should provide navigation function', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.navigate).toBeDefined();
      expect(typeof result.current.navigate).toBe('function');
    });

    it('should navigate to provided path', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/catering/menu-generator');
      });

      expect(mockPush).toHaveBeenCalledWith('/catering/menu-generator');
    });

    it('should return current path', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.currentPath).toBe('/catering/dietary');
    });

    it('should handle navigation with query parameters', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate(
          '/catering/dietary?wedding_id=123&filter=allergy',
        );
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/catering/dietary?wedding_id=123&filter=allergy',
      );
    });
  });

  describe('Breadcrumb Management', () => {
    it('should initialize with empty breadcrumbs', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.breadcrumbs).toEqual([]);
    });

    it('should add breadcrumb item', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.addBreadcrumb({
          label: 'Dietary Management',
          path: '/catering/dietary',
          isActive: true,
        });
      });

      expect(result.current.breadcrumbs).toHaveLength(1);
      expect(result.current.breadcrumbs[0]).toEqual({
        label: 'Dietary Management',
        path: '/catering/dietary',
        isActive: true,
      });
    });

    it('should update breadcrumbs on navigation', () => {
      const { result } = renderHook(() => useNavigation());

      // Add initial breadcrumb
      act(() => {
        result.current.addBreadcrumb({
          label: 'Dashboard',
          path: '/dashboard',
          isActive: false,
        });
      });

      act(() => {
        result.current.addBreadcrumb({
          label: 'Catering',
          path: '/catering',
          isActive: false,
        });
      });

      act(() => {
        result.current.addBreadcrumb({
          label: 'Dietary Management',
          path: '/catering/dietary',
          isActive: true,
        });
      });

      expect(result.current.breadcrumbs).toHaveLength(3);
      expect(result.current.breadcrumbs[2].isActive).toBe(true);
      expect(result.current.breadcrumbs[1].isActive).toBe(false);
    });

    it('should clear breadcrumbs', () => {
      const { result } = renderHook(() => useNavigation());

      // Add some breadcrumbs first
      act(() => {
        result.current.addBreadcrumb({
          label: 'Test',
          path: '/test',
          isActive: true,
        });
      });

      expect(result.current.breadcrumbs).toHaveLength(1);

      act(() => {
        result.current.clearBreadcrumbs();
      });

      expect(result.current.breadcrumbs).toHaveLength(0);
    });

    it('should handle breadcrumb navigation', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.addBreadcrumb({
          label: 'Dashboard',
          path: '/dashboard',
          isActive: false,
        });
      });

      act(() => {
        result.current.navigateToBreadcrumb('/dashboard');
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(result.current.breadcrumbs[0].isActive).toBe(true);
    });
  });

  describe('Navigation State Management', () => {
    it('should track navigation history', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/page1');
      });

      act(() => {
        result.current.navigate('/page2');
      });

      expect(result.current.canGoBack()).toBe(true);
      expect(result.current.navigationHistory).toHaveLength(2);
    });

    it('should handle back navigation', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/page1');
      });

      act(() => {
        result.current.navigate('/page2');
      });

      act(() => {
        result.current.goBack();
      });

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should prevent back navigation when no history', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.canGoBack()).toBe(false);

      act(() => {
        result.current.goBack();
      });

      expect(mockRouter.back).not.toHaveBeenCalled();
    });
  });

  describe('Query Parameter Handling', () => {
    it('should parse query parameters from current path', () => {
      vi.mocked(usePathname).mockReturnValue('/catering/dietary');

      // Mock window.location.search
      Object.defineProperty(window, 'location', {
        value: {
          search: '?wedding_id=123&category=allergy&verified=true',
        },
        writable: true,
      });

      const { result } = renderHook(() => useNavigation());

      expect(result.current.queryParams).toEqual({
        wedding_id: '123',
        category: 'allergy',
        verified: 'true',
      });
    });

    it('should update query parameters', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.updateQueryParams({
          filter: 'severity',
          value: '4',
        });
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('filter=severity'),
      );
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('value=4'));
    });

    it('should clear query parameters', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.clearQueryParams();
      });

      expect(mockPush).toHaveBeenCalledWith('/catering/dietary');
    });

    it('should preserve existing query parameters when updating', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?wedding_id=123&category=allergy',
        },
        writable: true,
      });

      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.updateQueryParams({
          severity: '4',
        });
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('wedding_id=123');
      expect(calledUrl).toContain('category=allergy');
      expect(calledUrl).toContain('severity=4');
    });
  });

  describe('Route Protection', () => {
    it('should check if route requires authentication', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.requiresAuth('/catering/dietary')).toBe(true);
      expect(result.current.requiresAuth('/login')).toBe(false);
      expect(result.current.requiresAuth('/public')).toBe(false);
    });

    it('should check user permissions for route', () => {
      const { result } = renderHook(() =>
        useNavigation({
          userPermissions: ['catering:read', 'catering:write'],
        }),
      );

      expect(result.current.canAccessRoute('/catering/dietary')).toBe(true);
      expect(result.current.canAccessRoute('/admin/users')).toBe(false);
    });

    it('should redirect to login for protected routes', () => {
      const { result } = renderHook(() =>
        useNavigation({
          isAuthenticated: false,
        }),
      );

      act(() => {
        result.current.navigate('/catering/dietary');
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/login?redirect=/catering/dietary',
      );
    });

    it('should redirect to access denied for unauthorized routes', () => {
      const { result } = renderHook(() =>
        useNavigation({
          isAuthenticated: true,
          userPermissions: ['basic:read'],
        }),
      );

      act(() => {
        result.current.navigate('/admin/settings');
      });

      expect(mockPush).toHaveBeenCalledWith('/access-denied');
    });
  });

  describe('Loading States', () => {
    it('should track navigation loading state', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.isNavigating).toBe(false);

      act(() => {
        result.current.navigate('/catering/menu-generator');
      });

      // Navigation should briefly show loading state
      expect(result.current.isNavigating).toBe(true);
    });

    it('should clear loading state after navigation', async () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/catering/menu-generator');
      });

      // Simulate navigation completion
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isNavigating).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors', () => {
      mockPush.mockRejectedValueOnce(new Error('Navigation failed'));

      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/invalid-route');
      });

      expect(result.current.navigationError).toBeTruthy();
      expect(result.current.navigationError?.message).toBe('Navigation failed');
    });

    it('should clear navigation errors', () => {
      const { result } = renderHook(() => useNavigation());

      // Set an error first
      act(() => {
        result.current.setNavigationError(new Error('Test error'));
      });

      expect(result.current.navigationError).toBeTruthy();

      act(() => {
        result.current.clearNavigationError();
      });

      expect(result.current.navigationError).toBeNull();
    });

    it('should retry failed navigation', () => {
      mockPush
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.navigate('/catering/dietary');
      });

      expect(result.current.navigationError).toBeTruthy();

      act(() => {
        result.current.retryNavigation();
      });

      expect(mockPush).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility Support', () => {
    it('should announce navigation changes to screen readers', () => {
      const announcespy = vi.fn();
      vi.stubGlobal('announceToScreenReader', announcespy);

      const { result } = renderHook(() =>
        useNavigation({
          announceNavigation: true,
        }),
      );

      act(() => {
        result.current.navigate('/catering/menu-generator');
      });

      expect(announcespy).toHaveBeenCalledWith('Navigated to menu generator');
    });

    it('should provide skip links', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.getSkipLinks()).toEqual([
        { label: 'Skip to main content', target: '#main-content' },
        { label: 'Skip to navigation', target: '#navigation' },
        { label: 'Skip to footer', target: '#footer' },
      ]);
    });

    it('should track focus management', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.setFocusTarget('#dietary-table');
      });

      act(() => {
        result.current.navigate('/catering/dietary');
      });

      expect(result.current.focusTarget).toBe('#dietary-table');
    });
  });

  describe('Mobile Navigation', () => {
    it('should detect mobile navigation patterns', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });

      const { result } = renderHook(() => useNavigation());

      expect(result.current.isMobileNavigation).toBe(true);
    });

    it('should handle swipe navigation gestures', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.handleSwipeGesture('left');
      });

      expect(mockRouter.back).toHaveBeenCalled();

      act(() => {
        result.current.handleSwipeGesture('right');
      });

      expect(mockRouter.forward).toHaveBeenCalled();
    });

    it('should provide mobile-optimized navigation options', () => {
      const { result } = renderHook(() => useNavigation());

      const mobileNavItems = result.current.getMobileNavigation();

      expect(mobileNavItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Dietary Management',
            icon: 'cutlery',
            path: '/catering/dietary',
          }),
        ]),
      );
    });
  });

  describe('Performance Optimizations', () => {
    it('should prefetch related routes', () => {
      const { result } = renderHook(() => useNavigation());

      act(() => {
        result.current.prefetchRoute('/catering/menu-generator');
      });

      expect(mockRouter.prefetch).toHaveBeenCalledWith(
        '/catering/menu-generator',
      );
    });

    it('should debounce rapid navigation attempts', async () => {
      const { result } = renderHook(() => useNavigation());

      // Rapid navigation calls
      act(() => {
        result.current.navigate('/page1');
        result.current.navigate('/page2');
        result.current.navigate('/page3');
      });

      // Should only call the last navigation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenLastCalledWith('/page3');
    });

    it('should cache navigation state', () => {
      const { result, rerender } = renderHook(() => useNavigation());

      act(() => {
        result.current.addBreadcrumb({
          label: 'Test',
          path: '/test',
          isActive: true,
        });
      });

      const initialBreadcrumbs = result.current.breadcrumbs;

      rerender();

      // Breadcrumbs should be maintained across re-renders
      expect(result.current.breadcrumbs).toEqual(initialBreadcrumbs);
    });
  });
});
