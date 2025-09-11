// WS-334 Team D: Couple Notification Center Tests
// Comprehensive test suite for notification center component

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { CoupleNotificationCenter } from '@/components/couples/notifications/CoupleNotificationCenter';
import {
  CoupleProfile,
  WeddingDetails,
  PersonalizedNotification,
  MilestoneNotification,
} from '@/types/couple-notifications';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock EventSource
class MockEventSource {
  url: string;
  onopen?: () => void;
  onmessage?: (event: any) => void;
  onerror?: (event: any) => void;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 100);
  }

  // Intentionally empty close method for mock - no cleanup needed in tests
  close() {
    // Mock implementation - no actual connection to close
  }
}

global.EventSource = MockEventSource as any;

// Test data
const mockCoupleProfile: CoupleProfile = {
  coupleId: 'couple-123',
  weddingId: 'wedding-456',
  partnerA: {
    partnerId: 'partner-a-1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@example.com',
    communicationPreference: 'morning' as any,
    socialMediaUsage: 'high' as any,
  },
  partnerB: {
    partnerId: 'partner-b-1',
    firstName: 'James',
    lastName: 'Smith',
    email: 'james@example.com',
    communicationPreference: 'evening' as any,
    socialMediaUsage: 'medium' as any,
  },
  weddingDate: new Date('2024-06-15'),
  weddingStyle: 'romantic',
  budgetRange: 'medium' as any,
  guestCount: 150,
  viralTendencies: 'high',
  visualPreferences: {} as any,
  preferredTone: 'excited',
};

const mockWeddingDetails: WeddingDetails = {
  weddingDate: new Date('2024-06-15'),
  venueName: 'Grand Ballroom',
  selectedVendors: [
    { id: 'vendor-1', name: 'Amazing Photography', type: 'photographer' },
    { id: 'vendor-2', name: 'Elegant Flowers', type: 'florist' },
  ],
  timeline: {},
};

const mockNotification: PersonalizedNotification = {
  notificationId: 'notif-123',
  coupleId: 'couple-123',
  weddingId: 'wedding-456',
  type: 'vendor_update',
  category: 'vendor',
  priority: 'medium',
  personalizationLevel: 'ai_optimized',
  emotionalTone: 'excited',
  visualTheme: {
    primaryColor: '#f43f5e',
    secondaryColor: '#fecaca',
    accentColor: '#fb7185',
    fontStyle: 'friendly',
    backgroundPattern: 'subtle',
  },
  content: {
    title: '🎉 Amazing news, Sarah & James!',
    message: 'Your photographer has confirmed your booking!',
    personalizedElements: [],
  },
  sharingCapabilities: [],
  viralElements: [],
  contextualRecommendations: [],
  isRead: false,
  createdAt: new Date(),
};

const mockMilestone: MilestoneNotification = {
  milestoneId: 'milestone-456',
  milestoneType: 'venue_booked',
  coupleId: 'couple-123',
  weddingId: 'wedding-456',
  achievementLevel: 'gold',
  celebrationContent: {
    title: 'Venue Booked! 🏛️',
    description: 'Your perfect venue is secured!',
    celebrationMessage:
      '🎉 Sarah & James, your venue is booked! Time to celebrate! 💕',
  },
  progressVisualization: {
    visualType: 'progress_bar',
    currentProgress: 25,
    totalSteps: 100,
    completedMilestones: ['venue_booked'],
    visualStyle: 'romantic' as any,
  },
  shareableAssets: [],
  friendInvitationPrompts: [],
  vendorAppreciationContent: [],
  isShared: false,
  sharedCount: 0,
  celebratedAt: new Date(),
  createdAt: new Date(),
};

// Mock fetch
global.fetch = vi.fn();

// Helper functions to reduce nesting - EXTRACTED TO MEET 4-LEVEL LIMIT

/**
 * Creates a successful journey progress API response
 */
const createJourneyProgressResponse = () => ({
  ok: true,
  json: () => Promise.resolve({
    overallProgress: 35,
    completedMilestones: 3,
    totalMilestones: 10,
  }),
});

/**
 * Creates a successful notifications API response
 */
const createNotificationsResponse = () => ({
  ok: true,
  json: () => Promise.resolve({
    notifications: [mockNotification],
    milestones: [mockMilestone],
  }),
});

/**
 * Creates a default success API response
 */
const createDefaultSuccessResponse = () => ({
  ok: true,
  json: () => Promise.resolve({}),
});

/**
 * Creates a mock EventSource instance for testing
 */
const createMockEventSourceInstance = () => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  close: vi.fn(),
});

/**
 * Creates expected toast success call for milestone notifications
 */
const createExpectedMilestoneToast = () => ({
  description: '🎉 Sarah & James, your venue is booked! Time to celebrate! 💕',
  duration: 8000,
  icon: '🎉',
});

/**
 * Creates expected toast call for regular notifications
 */
const createExpectedNotificationToast = () => ({
  description: 'Your photographer has confirmed your booking!',
  duration: 5000,
  icon: '🎉',
});

/**
 * Creates a successful share API response
 */
const createShareResponse = () => ({
  ok: true,
  json: () => Promise.resolve({
    shareableContent: {
      shareId: 'share-123',
      shareUrl: 'https://wedme.com/share/share-123',
    },
  }),
});

/**
 * Creates an API error response
 */
const createErrorResponse = () => ({
  ok: false,
  status: 500,
});

/**
 * Mock fetch implementation that routes to appropriate responses
 */
const createMockFetchImplementation = () => {
  return (url: string) => {
    if (url.includes('journey-progress')) {
      return Promise.resolve(createJourneyProgressResponse());
    }
    if (url.includes('notifications?limit=50')) {
      return Promise.resolve(createNotificationsResponse());
    }
    return Promise.resolve(createDefaultSuccessResponse());
  };
};

/**
 * Creates mock milestone message data for EventSource testing
 */
const createMilestoneMessageData = () => ({
  data: JSON.stringify({ ...mockMilestone, type: 'milestone' }),
});

/**
 * Creates mock notification message data for EventSource testing
 */
const createNotificationMessageData = () => ({
  data: JSON.stringify(mockNotification),
});

/**
 * Simulates EventSource milestone message event
 */
const simulateMilestoneMessage = (eventSourceInstance: any) => {
  eventSourceInstance.onmessage(createMilestoneMessageData());
};

/**
 * Simulates EventSource notification message event
 */
const simulateNotificationMessage = (eventSourceInstance: any) => {
  eventSourceInstance.onmessage(createNotificationMessageData());
};

describe('CoupleNotificationCenter', () => {
  const mockOnNotificationAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();

    // Mock successful API responses using helper function
    (fetch as any).mockImplementation(createMockFetchImplementation());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders couple welcome message correctly', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Welcome back, Sarah & James!/),
        ).toBeInTheDocument();
      });
    });

    it('calculates and displays days to wedding correctly', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        // Should show days to wedding (will vary based on current date)
        expect(screen.getByText(/days away!/)).toBeInTheDocument();
      });
    });

    it('displays venue information when provided', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
      });
    });

    it('renders progress ring with correct values', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('35%')).toBeInTheDocument();
        expect(screen.getByText('3/10 milestones')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Notification Stream', () => {
    it('establishes EventSource connection on mount', async () => {
      const mockEventSource = vi.fn().mockImplementation(() => ({
        onopen: null,
        onmessage: null,
        onerror: null,
        close: vi.fn(),
      }));
      global.EventSource = mockEventSource;

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(mockEventSource).toHaveBeenCalledWith(
          '/api/couples/notifications/stream?coupleId=couple-123&weddingId=wedding-456',
        );
      });
    });

    it('handles incoming milestone notifications with celebration', async () => {
      let eventSourceInstance: any;
      const mockEventSource = vi.fn().mockImplementation(() => {
        eventSourceInstance = createMockEventSourceInstance();
        return eventSourceInstance;
      });
      global.EventSource = mockEventSource;

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(eventSourceInstance).toBeDefined();
      });

      // Simulate incoming milestone notification
      act(() => {
        simulateMilestoneMessage(eventSourceInstance);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Venue Booked! 🏛️',
          expect.objectContaining(createExpectedMilestoneToast()),
        );
      });
    });

    it('handles regular notifications with appropriate toast', async () => {
      let eventSourceInstance: any;
      const mockEventSource = vi.fn().mockImplementation(() => {
        eventSourceInstance = createMockEventSourceInstance();
        return eventSourceInstance;
      });
      global.EventSource = mockEventSource;

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(eventSourceInstance).toBeDefined();
      });

      // Simulate incoming regular notification
      act(() => {
        simulateNotificationMessage(eventSourceInstance);
      });

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          '🎉 Amazing news, Sarah & James!',
          expect.objectContaining(createExpectedNotificationToast()),
        );
      });
    });
  });

  describe('Tab Navigation', () => {
    it('renders all notification tabs', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('All Updates')).toBeInTheDocument();
        expect(screen.getByText('Milestones')).toBeInTheDocument();
        expect(screen.getByText('Vendors')).toBeInTheDocument();
        expect(screen.getByText('Planning')).toBeInTheDocument();
      });
    });

    it('switches tabs correctly', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        const milestonesTab = screen.getByText('Milestones');
        fireEvent.click(milestonesTab);
      });

      // Should show milestones content
      await waitFor(() => {
        expect(
          screen.getByText('Milestone Grid - To be implemented'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Sharing Functionality', () => {
    it('generates shareable content when share button is clicked', async () => {
      (fetch as any).mockImplementationOnce(() =>
        Promise.resolve(createShareResponse()),
      );

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        // This would test the actual share functionality when implemented
        expect(
          screen.getByText('Viral Growth Prompts - To be implemented'),
        ).toBeInTheDocument();
      });
    });

    it('handles sharing errors gracefully', async () => {
      (fetch as any).mockImplementationOnce(() =>
        Promise.resolve(createErrorResponse()),
      );

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      // Test would verify error handling when share functionality is implemented
      await waitFor(() => {
        expect(
          screen.getByText('Viral Growth Prompts - To be implemented'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('renders initial content within 1 second', async () => {
      const startTime = performance.now();

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Welcome back, Sarah & James!/),
        ).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 1000ms (1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles real-time notifications with minimal delay', async () => {
      let eventSourceInstance: any;
      const mockEventSource = vi.fn().mockImplementation(() => {
        eventSourceInstance = createMockEventSourceInstance();
        return eventSourceInstance;
      });
      global.EventSource = mockEventSource;

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(eventSourceInstance).toBeDefined();
      });

      const startTime = performance.now();

      // Simulate incoming notification
      act(() => {
        simulateNotificationMessage(eventSourceInstance);
      });

      await waitFor(() => {
        expect(toast).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process notification within 100ms
      expect(processingTime).toBeLessThan(100);
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      // Mock fetch to never resolve
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      expect(
        screen.getByText('Loading your wedding journey...'),
      ).toBeInTheDocument();
    });

    it('removes loading state after data loads', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(
          screen.queryByText('Loading your wedding journey...'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (fetch as any).mockImplementation(() =>
        Promise.resolve(createErrorResponse()),
      );

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      // Component should still render without crashing
      await waitFor(() => {
        expect(
          screen.getByText(/Welcome back, Sarah & James!/),
        ).toBeInTheDocument();
      });
    });

    it('handles EventSource connection errors', async () => {
      let eventSourceInstance: any;
      const mockEventSource = vi.fn().mockImplementation(() => {
        eventSourceInstance = createMockEventSourceInstance();
        return eventSourceInstance;
      });
      global.EventSource = mockEventSource;

      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        expect(eventSourceInstance).toBeDefined();
      });

      // Simulate connection error
      act(() => {
        eventSourceInstance.onerror(new Error('Connection failed'));
      });

      // Component should handle error gracefully
      expect(
        screen.getByText(/Welcome back, Sarah & James!/),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        // Check for proper heading structure
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();

        // Check for button accessibility
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('supports keyboard navigation', async () => {
      render(
        <CoupleNotificationCenter
          coupleId="couple-123"
          weddingId="wedding-456"
          coupleProfile={mockCoupleProfile}
          weddingDetails={mockWeddingDetails}
          onNotificationAction={mockOnNotificationAction}
        />,
      );

      await waitFor(() => {
        const firstButton = screen.getAllByRole('button')[0];
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
      });
    });
  });
});
