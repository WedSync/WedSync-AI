import { render, screen, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import TypingIndicator from '@/components/chatbot/TypingIndicator';

expect.extend(toHaveNoViolations);

// Mock performance.now for timing tests
const mockPerformanceNow = jest.fn();
Object.defineProperty(global.performance, 'now', {
  writable: true,
  value: mockPerformanceNow,
});

describe('TypingIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  describe('WS-243-T001: TypingIndicator animation system', () => {
    it('renders typing indicator with smooth animations', () => {
      render(<TypingIndicator isTyping={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('animate-typing');

      const dots = screen.getAllByTestId(/typing-dot-\d/);
      expect(dots).toHaveLength(3);
      
      dots.forEach((dot, index) => {
        expect(dot).toHaveClass('animate-bounce');
        expect(dot).toHaveStyle({
          animationDelay: `${index * 0.15}s`,
        });
      });
    });

    it('optimizes animation performance', () => {
      render(<TypingIndicator isTyping={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      
      // Should use CSS animations for performance
      expect(indicator).toHaveClass('will-change-opacity');
      
      // Should use transform3d for hardware acceleration
      const computedStyles = window.getComputedStyle(indicator);
      expect(computedStyles.transform).toContain('translate3d');
    });

    it('minimizes battery impact on mobile', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      render(<TypingIndicator isTyping={true} optimizeForMobile={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      
      // Should use reduced motion on mobile
      expect(indicator).toHaveClass('reduced-motion');
      expect(indicator).toHaveStyle({
        animationDuration: '2s', // Slower animation to save battery
      });
    });

    it('pauses animation when not visible', () => {
      const { rerender } = render(<TypingIndicator isTyping={true} />);

      let indicator = screen.getByTestId('typing-indicator');
      expect(indicator).not.toHaveClass('animation-paused');

      // Mock Intersection Observer to simulate element not visible
      const mockIntersectionObserver = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      });
      window.IntersectionObserver = mockIntersectionObserver;

      rerender(<TypingIndicator isTyping={true} pauseWhenHidden={true} />);
      
      // Simulate not intersecting (not visible)
      const [callback] = mockIntersectionObserver.mock.calls[0];
      callback([{ isIntersecting: false }]);

      indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('animation-paused');
    });

    it('handles animation frame rate correctly', () => {
      const mockRequestAnimationFrame = jest.fn();
      global.requestAnimationFrame = mockRequestAnimationFrame;

      render(<TypingIndicator isTyping={true} targetFPS={30} />);

      // Should throttle to 30fps for battery optimization
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      
      // Verify frame rate calculation
      const animationCallback = mockRequestAnimationFrame.mock.calls[0][0];
      expect(typeof animationCallback).toBe('function');
    });
  });

  describe('WS-243-T002: TypingIndicator timing accuracy', () => {
    it('estimates AI response time accurately', async () => {
      const mockResponseTimeEstimate = 3000; // 3 seconds

      render(
        <TypingIndicator 
          isTyping={true} 
          estimatedResponseTime={mockResponseTimeEstimate}
        />
      );

      const progressBar = screen.getByTestId('response-time-progress');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('max', '3000');

      // Simulate time passing
      act(() => {
        mockPerformanceNow.mockReturnValue(1500); // 1.5 seconds later
        jest.advanceTimersByTime(1500);
      });

      expect(progressBar).toHaveAttribute('value', '1500');
    });

    it('adjusts timing based on message complexity', () => {
      const complexQuery = 'Can you create a detailed wedding timeline with vendor coordination for a 200-guest outdoor ceremony in June?';
      
      render(
        <TypingIndicator 
          isTyping={true} 
          query={complexQuery}
          adaptiveTiming={true}
        />
      );

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveAttribute('data-complexity', 'high');
      
      const estimatedTime = screen.getByTestId('estimated-time');
      expect(estimatedTime).toHaveTextContent(/5-7 seconds/i);
    });

    it('provides realistic typing simulation', () => {
      const typingSpeed = 150; // words per minute
      const expectedResponse = 'Here are some great venue options for your wedding...';

      render(
        <TypingIndicator 
          isTyping={true}
          typingSpeed={typingSpeed}
          simulateTyping={true}
          expectedResponse={expectedResponse}
        />
      );

      const wordsCount = expectedResponse.split(' ').length;
      const expectedDuration = (wordsCount / typingSpeed) * 60 * 1000; // Convert to ms

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveStyle({
        animationDuration: `${expectedDuration}ms`,
      });
    });

    it('handles dynamic timing adjustments', async () => {
      const { rerender } = render(
        <TypingIndicator 
          isTyping={true} 
          estimatedResponseTime={3000}
          allowDynamicAdjustment={true}
        />
      );

      let progressBar = screen.getByTestId('response-time-progress');
      expect(progressBar).toHaveAttribute('max', '3000');

      // Simulate receiving updated estimate
      rerender(
        <TypingIndicator 
          isTyping={true} 
          estimatedResponseTime={5000}
          allowDynamicAdjustment={true}
        />
      );

      progressBar = screen.getByTestId('response-time-progress');
      expect(progressBar).toHaveAttribute('max', '5000');
      
      // Should show adjustment notification
      expect(screen.getByText(/response taking longer/i)).toBeInTheDocument();
    });

    it('handles timeout scenarios gracefully', async () => {
      jest.useFakeTimers();

      render(
        <TypingIndicator 
          isTyping={true} 
          estimatedResponseTime={3000}
          maxWaitTime={10000}
        />
      );

      // Fast-forward past max wait time
      act(() => {
        jest.advanceTimersByTime(11000);
      });

      expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('WS-243-T003: TypingIndicator accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = render(<TypingIndicator isTyping={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides screen reader announcements', () => {
      render(<TypingIndicator isTyping={true} />);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
      expect(announcement).toHaveTextContent(/assistant is typing/i);
    });

    it('supports reduced motion preferences', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(<TypingIndicator isTyping={true} respectReducedMotion={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('reduced-motion');
      
      // Should show static indicator instead of animation
      expect(screen.getByText(/assistant is responding/i)).toBeInTheDocument();
      expect(screen.queryByTestId('typing-dot-0')).not.toBeInTheDocument();
    });

    it('provides high contrast visibility', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(<TypingIndicator isTyping={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('high-contrast');
      
      const dots = screen.getAllByTestId(/typing-dot-\d/);
      dots.forEach(dot => {
        const styles = window.getComputedStyle(dot);
        expect(styles.backgroundColor).toBe('rgb(0, 0, 0)'); // High contrast black
      });
    });

    it('announces progress updates for screen readers', async () => {
      jest.useFakeTimers();

      render(
        <TypingIndicator 
          isTyping={true} 
          estimatedResponseTime={6000}
          announceProgress={true}
        />
      );

      const announcement = screen.getByRole('status');
      
      // Should announce progress at intervals
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(announcement).toHaveTextContent(/response in about 4 seconds/i);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(announcement).toHaveTextContent(/response in about 2 seconds/i);

      jest.useRealTimers();
    });
  });

  describe('WS-243-T004: TypingIndicator customization', () => {
    it('applies brand colors correctly', () => {
      const brandTheme = {
        primary: '#6B46C1',
        secondary: '#EC4899',
        accent: '#10B981',
      };

      render(
        <TypingIndicator 
          isTyping={true} 
          theme={brandTheme}
        />
      );

      const dots = screen.getAllByTestId(/typing-dot-\d/);
      expect(dots[0]).toHaveStyle({ backgroundColor: brandTheme.primary });
      expect(dots[1]).toHaveStyle({ backgroundColor: brandTheme.secondary });
      expect(dots[2]).toHaveStyle({ backgroundColor: brandTheme.accent });
    });

    it('supports different animation speeds', () => {
      const { rerender } = render(
        <TypingIndicator isTyping={true} animationSpeed="slow" />
      );

      let indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('animation-slow');

      rerender(<TypingIndicator isTyping={true} animationSpeed="fast" />);
      
      indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('animation-fast');
    });

    it('allows different dot styles', () => {
      const { rerender } = render(
        <TypingIndicator isTyping={true} dotStyle="pulse" />
      );

      let dots = screen.getAllByTestId(/typing-dot-\d/);
      dots.forEach(dot => {
        expect(dot).toHaveClass('animate-pulse');
      });

      rerender(<TypingIndicator isTyping={true} dotStyle="wave" />);
      
      dots = screen.getAllByTestId(/typing-dot-\d/);
      dots.forEach(dot => {
        expect(dot).toHaveClass('animate-wave');
      });
    });

    it('supports custom messages', () => {
      const customMessages = {
        typing: 'Crafting your perfect wedding response...',
        processing: 'Analyzing wedding venues...',
        almostDone: 'Almost ready with recommendations!',
      };

      render(
        <TypingIndicator 
          isTyping={true} 
          messages={customMessages}
          showMessage={true}
        />
      );

      expect(screen.getByText(customMessages.typing)).toBeInTheDocument();
    });

    it('handles different sizes correctly', () => {
      const { rerender } = render(
        <TypingIndicator isTyping={true} size="small" />
      );

      let indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('size-small');

      rerender(<TypingIndicator isTyping={true} size="large" />);
      
      indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('size-large');
    });
  });

  describe('WS-243-T005: TypingIndicator state management', () => {
    it('shows and hides based on typing state', () => {
      const { rerender } = render(<TypingIndicator isTyping={false} />);

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();

      rerender(<TypingIndicator isTyping={true} />);
      
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

    it('integrates with WebSocket connection status', () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn(),
      };

      render(
        <TypingIndicator 
          isTyping={true} 
          websocket={mockWebSocket}
        />
      );

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

      // Simulate connection loss
      const { rerender } = render(
        <TypingIndicator 
          isTyping={true} 
          websocket={{ ...mockWebSocket, readyState: WebSocket.CLOSED }}
        />
      );

      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    });

    it('handles error states appropriately', () => {
      render(
        <TypingIndicator 
          isTyping={true} 
          error="Failed to connect to AI service"
        />
      );

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('manages multiple concurrent typing states', () => {
      render(
        <TypingIndicator 
          isTyping={true}
          typingUsers={['AI Assistant', 'Wedding Planner']}
        />
      );

      expect(screen.getByText(/ai assistant and wedding planner are typing/i)).toBeInTheDocument();
      
      const indicators = screen.getAllByTestId('typing-indicator');
      expect(indicators).toHaveLength(2);
    });

    it('handles rapid state changes smoothly', async () => {
      const { rerender } = render(<TypingIndicator isTyping={true} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();

      // Rapid toggle
      rerender(<TypingIndicator isTyping={false} />);
      rerender(<TypingIndicator isTyping={true} />);
      rerender(<TypingIndicator isTyping={false} />);
      rerender(<TypingIndicator isTyping={true} />);

      // Should handle transitions smoothly without flickering
      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('smooth-transition');
    });
  });

  describe('WS-243-T008: TypingIndicator wedding context', () => {
    it('shows vendor-specific messaging', () => {
      render(
        <TypingIndicator 
          isTyping={true}
          context={{ vendor: 'photographer', expertise: 'wedding photography' }}
          showContext={true}
        />
      );

      expect(screen.getByText(/photography expert is typing/i)).toBeInTheDocument();
      expect(screen.getByTestId('vendor-avatar')).toHaveAttribute('src', '/avatars/photographer.png');
    });

    it('indicates response urgency for wedding dates', () => {
      const urgentWeddingContext = {
        weddingDate: '2024-03-15', // Soon
        daysUntilWedding: 30,
        priority: 'high'
      };

      render(
        <TypingIndicator 
          isTyping={true}
          weddingContext={urgentWeddingContext}
          showUrgency={true}
        />
      );

      expect(screen.getByTestId('urgency-indicator')).toHaveClass('urgent');
      expect(screen.getByText(/priority response/i)).toBeInTheDocument();
      expect(screen.getByText(/30 days until wedding/i)).toBeInTheDocument();
    });

    it('shows expected response time for wedding queries', () => {
      const weddingQueryTypes = [
        { type: 'venue-search', expectedTime: 8000, complexity: 'high' },
        { type: 'budget-planning', expectedTime: 5000, complexity: 'medium' },
        { type: 'quick-question', expectedTime: 2000, complexity: 'low' },
      ];

      weddingQueryTypes.forEach(query => {
        const { rerender } = render(
          <TypingIndicator 
            isTyping={true}
            queryType={query.type}
            showExpectedTime={true}
          />
        );

        const timeEstimate = screen.getByTestId('time-estimate');
        expect(timeEstimate).toHaveTextContent(`${query.expectedTime / 1000}s`);
        expect(timeEstimate).toHaveClass(`complexity-${query.complexity}`);

        rerender(<div />); // Clear for next iteration
      });
    });

    it('displays wedding season considerations', () => {
      const peakSeasonContext = {
        season: 'summer',
        isPeakSeason: true,
        expectedDelays: 'High demand period'
      };

      render(
        <TypingIndicator 
          isTyping={true}
          seasonContext={peakSeasonContext}
          showSeasonalInfo={true}
        />
      );

      expect(screen.getByText(/peak wedding season/i)).toBeInTheDocument();
      expect(screen.getByText(/high demand period/i)).toBeInTheDocument();
      expect(screen.getByTestId('seasonal-indicator')).toHaveClass('peak-season');
    });

    it('integrates with wedding timeline urgency', () => {
      const timelineContext = {
        upcomingDeadlines: [
          { task: 'Venue booking', daysLeft: 5, priority: 'critical' },
          { task: 'Save the dates', daysLeft: 45, priority: 'high' },
        ]
      };

      render(
        <TypingIndicator 
          isTyping={true}
          timelineContext={timelineContext}
          showTimeline={true}
        />
      );

      expect(screen.getByText(/critical deadline in 5 days/i)).toBeInTheDocument();
      expect(screen.getByTestId('deadline-alert')).toHaveClass('critical');
    });
  });

  describe('Performance and Resource Management', () => {
    it('cleans up animations on unmount', () => {
      const mockCancelAnimationFrame = jest.fn();
      global.cancelAnimationFrame = mockCancelAnimationFrame;

      const { unmount } = render(<TypingIndicator isTyping={true} />);
      
      unmount();
      
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('optimizes for battery life on mobile', () => {
      // Mock battery API
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.2, // 20% battery
          charging: false,
        }),
        writable: true,
      });

      render(<TypingIndicator isTyping={true} batteryOptimized={true} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('battery-optimized');
      
      // Should use reduced animation when battery is low
      expect(indicator).toHaveStyle({
        animationDuration: '3s', // Slower to save battery
      });
    });

    it('handles memory efficiently with long sessions', () => {
      const { rerender } = render(<TypingIndicator isTyping={false} />);

      // Simulate many state changes
      for (let i = 0; i < 1000; i++) {
        rerender(<TypingIndicator isTyping={i % 2 === 0} />);
      }

      // Should not accumulate memory leaks
      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toBeInTheDocument();
      
      // Verify no excessive DOM nodes created
      const allIndicators = document.querySelectorAll('[data-testid*="typing"]');
      expect(allIndicators.length).toBeLessThan(10);
    });
  });
});