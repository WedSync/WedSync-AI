import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { MobileEmailTemplateGenerator } from '@/components/mobile/ai/MobileEmailTemplateGenerator';
import { MobileAIEmailOptimizer } from '@/lib/mobile/ai-email-optimization';

// Mock dependencies
jest.mock('@/lib/mobile/ai-email-optimization');
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock mobile APIs
Object.defineProperty(global.navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
};

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: jest.fn(() => mockSpeechRecognition),
  writable: true,
});

// Mock touch events
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
) => {
  return new TouchEvent(type, {
    touches: touches.map((touch) => ({ ...touch }) as Touch),
    changedTouches: touches.map((touch) => ({ ...touch }) as Touch),
    bubbles: true,
    cancelable: true,
  });
};

// Mock resize observer for orientation changes
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('MobileEmailTemplateGenerator', () => {
  const mockOnTemplatesGenerated = jest.fn();
  const mockOptimizer = {
    generateMobileOptimizedTemplates: jest.fn(),
  };

  const mockTemplates = [
    {
      id: 'test-1',
      subject: 'Thank you for your inquiry!',
      content:
        'Hello John, thank you for reaching out about wedding photography...',
      tone: 'professional' as const,
      stage: 'inquiry' as const,
      confidence: 0.9,
      wordCount: 25,
      estimatedReadTime: '1 min read',
      mobileOptimized: true,
      touchFriendly: true,
    },
    {
      id: 'test-2',
      subject: "Let's capture your special day!",
      content:
        "Hi John! I'm excited about the possibility of photographing your wedding...",
      tone: 'friendly' as const,
      stage: 'booking' as const,
      confidence: 0.85,
      wordCount: 30,
      estimatedReadTime: '1 min read',
      mobileOptimized: true,
      touchFriendly: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (MobileAIEmailOptimizer as jest.Mock).mockImplementation(
      () => mockOptimizer,
    );
    mockOptimizer.generateMobileOptimizedTemplates.mockResolvedValue(
      mockTemplates,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders mobile-optimized form elements', () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      expect(screen.getByText('AI Email Templates')).toBeInTheDocument();
      expect(
        screen.getByText('Mobile-optimized for wedding photographers'),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter client's name..."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /generate ai templates/i }),
      ).toBeInTheDocument();
    });

    it('displays quick preset buttons with touch-optimized sizing', () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const presetButtons = screen.getAllByRole('button');
      const inquiryButton = presetButtons.find((button) =>
        button.textContent?.includes('📞 Inquiry Response'),
      );

      expect(inquiryButton).toBeInTheDocument();
      expect(inquiryButton).toHaveClass('min-h-[40px]'); // Touch-friendly size
    });

    it('shows voice input button when speech recognition is supported', () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      expect(voiceButton).toBeInTheDocument();
    });

    it('adapts layout for different orientations', async () => {
      const { container } = render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Simulate orientation change
      Object.defineProperty(window, 'innerHeight', {
        value: 480,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
        writable: true,
      });

      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      await waitFor(() => {
        expect(container.querySelector('.landscape-mode')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('updates client context when name is entered', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      expect(nameInput).toHaveValue('John Smith');
    });

    it('enables generate button when required fields are filled', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      const nameInput = screen.getByPlaceholderText("Enter client's name...");

      // Button should be disabled initially
      expect(generateButton).toBeDisabled();

      // Fill required field
      await user.type(nameInput, 'John Smith');

      expect(generateButton).toBeEnabled();
    });

    it('handles quick preset selection with haptic feedback', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const inquiryPreset = screen.getByText('📞 Inquiry Response');
      await user.click(inquiryPreset);

      expect(navigator.vibrate).toHaveBeenCalledWith(25); // Light haptic feedback
    });

    it('toggles collapsible form sections', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const weddingDetailsSection = screen.getByText('Wedding Details');
      await user.click(weddingDetailsSection);

      await waitFor(() => {
        const dateInput = screen.getByDisplayValue('');
        expect(dateInput).toBeVisible();
      });
    });

    it('handles urgency level selection with visual feedback', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Open priority section
      const prioritySection = screen.getByText('Priority Level');
      await user.click(prioritySection);

      await waitFor(async () => {
        const highPriorityButton = screen.getByText('🔴 High');
        await user.click(highPriorityButton);

        expect(highPriorityButton).toHaveClass('bg-blue-500');
        expect(navigator.vibrate).toHaveBeenCalledWith(25);
      });
    });
  });

  describe('Voice Recognition', () => {
    it('starts voice recognition when mic button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const micButton = screen.getByRole('button', { name: /voice input/i });
      await user.click(micButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    it('displays voice transcript with confidence level', async () => {
      const { rerender } = render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Simulate voice recognition result
      act(() => {
        mockSpeechRecognition.onresult({
          resultIndex: 0,
          results: [
            {
              0: {
                transcript: 'The client name is Sarah Johnson',
                confidence: 0.85,
              },
              isFinal: true,
            },
          ],
        });
      });

      rerender(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Voice input:/)).toBeInTheDocument();
        expect(
          screen.getByText(/The client name is Sarah Johnson/),
        ).toBeInTheDocument();
        expect(screen.getByText(/Confidence: 85%/)).toBeInTheDocument();
      });
    });

    it('auto-fills form fields from voice input', async () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Simulate voice input with wedding date
      act(() => {
        mockSpeechRecognition.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'wedding date is June 15', confidence: 0.9 },
              isFinal: true,
            },
          ],
        });
      });

      await waitFor(() => {
        // Wedding details section should auto-expand and fill
        expect(screen.getByText('Wedding Details')).toBeInTheDocument();
      });
    });
  });

  describe('Touch Gestures', () => {
    it('handles pull-to-refresh gesture', async () => {
      const { container } = render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const pullToRefreshContainer = container.querySelector(
        '.relative.overflow-auto',
      );

      // Simulate pull gesture
      if (pullToRefreshContainer) {
        fireEvent.touchStart(pullToRefreshContainer, {
          touches: [{ clientX: 0, clientY: 100 }],
        });

        fireEvent.touchMove(pullToRefreshContainer, {
          touches: [{ clientX: 0, clientY: 200 }],
        });

        fireEvent.touchEnd(pullToRefreshContainer);
      }

      // Should trigger haptic feedback
      expect(navigator.vibrate).toHaveBeenCalled();
    });

    it('provides haptic feedback for button interactions', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'Test User');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      expect(navigator.vibrate).toHaveBeenCalledWith(50); // Medium haptic feedback
    });
  });

  describe('AI Template Generation', () => {
    it('generates templates when form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Fill required fields
      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(
          mockOptimizer.generateMobileOptimizedTemplates,
        ).toHaveBeenCalledWith({
          clientContext: expect.objectContaining({
            name: 'John Smith',
            inquiryType: 'general',
            urgency: 'medium',
          }),
          maxVariants: 3,
          mobileOptimized: true,
          touchFriendly: true,
        });
      });

      expect(mockOnTemplatesGenerated).toHaveBeenCalledWith(mockTemplates);
    });

    it('shows loading state during generation', async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: any) => void;

      mockOptimizer.generateMobileOptimizedTemplates.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGeneration = resolve;
          }),
      );

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Generating Templates...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      // Complete generation
      act(() => {
        resolveGeneration(mockTemplates);
      });

      await waitFor(() => {
        expect(screen.getByText('Generate AI Templates')).toBeInTheDocument();
        expect(generateButton).toBeEnabled();
      });
    });

    it('handles generation errors gracefully', async () => {
      const user = userEvent.setup();

      mockOptimizer.generateMobileOptimizedTemplates.mockRejectedValue(
        new Error('API Error'),
      );

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 100]); // Error haptic
      });
    });

    it('displays generated templates in TouchOptimizedVariantSelector', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generated Templates')).toBeInTheDocument();
        // TouchOptimizedVariantSelector should be rendered with templates
      });
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('optimizes for slow network connections', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g', saveData: true },
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(
          mockOptimizer.generateMobileOptimizedTemplates,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            maxVariants: 3, // Should still be 3 for this test
            mobileOptimized: true,
          }),
        );
      });
    });

    it('handles offline mode gracefully', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.type(nameInput, 'John Smith');

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      await user.click(generateButton);

      // Should still attempt generation (fallback to offline templates)
      await waitFor(() => {
        expect(
          mockOptimizer.generateMobileOptimizedTemplates,
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Settings and Preferences', () => {
    it('opens settings bottom sheet', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sound Effects')).toBeInTheDocument();
        expect(screen.getByText('Voice Input')).toBeInTheDocument();
      });
    });

    it('toggles sound effects setting', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(async () => {
        const soundToggle = screen.getByRole('button', { name: /volume/i });
        await user.click(soundToggle);
        expect(navigator.vibrate).toHaveBeenCalledWith(25);
      });
    });

    it('shows voice input availability status', async () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await userEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument(); // Voice input status
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for touch targets', () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate ai templates/i,
      });
      expect(generateButton).toHaveAccessibleName();

      const nameInput = screen.getByLabelText(/client name/i);
      expect(nameInput).toHaveAccessibleName();
    });

    it('maintains focus management for mobile keyboards', async () => {
      const user = userEvent.setup();

      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter client's name...");
      await user.click(nameInput);

      expect(nameInput).toHaveFocus();
    });

    it('provides screen reader friendly content', () => {
      render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Check for screen reader friendly text
      expect(
        screen.getByText('Mobile-optimized for wedding photographers'),
      ).toBeInTheDocument();
      expect(screen.getByText(/client name/i)).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function),
      );
    });

    it('stops voice recognition on unmount', () => {
      const { unmount } = render(
        <MobileEmailTemplateGenerator
          onTemplatesGenerated={mockOnTemplatesGenerated}
        />,
      );

      // Start voice recognition
      act(() => {
        mockSpeechRecognition.start();
      });

      unmount();

      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });
  });
});
