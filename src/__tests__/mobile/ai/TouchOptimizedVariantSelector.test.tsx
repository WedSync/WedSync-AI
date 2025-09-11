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

import { TouchOptimizedVariantSelector } from '@/components/mobile/ai/TouchOptimizedVariantSelector';

// Mock dependencies
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

Object.defineProperty(global.navigator, 'share', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(global.navigator.clipboard, 'writeText', {
  value: jest.fn(),
  writable: true,
});

const mockTemplates = [
  {
    id: 'template-1',
    subject: 'Thank you for your inquiry!',
    content:
      'Hello John,\n\nThank you for reaching out about wedding photography. I would love to learn more about your special day and how I can help capture those precious moments.\n\nBest regards,\nSarah',
    tone: 'professional' as const,
    stage: 'inquiry' as const,
    confidence: 0.9,
    wordCount: 35,
    estimatedReadTime: '1 min read',
    mobileOptimized: true,
    touchFriendly: true,
  },
  {
    id: 'template-2',
    subject: "Let's create magic together! ✨",
    content:
      "Hi John!\n\nI'm so excited you're considering me for your wedding photography! Your love story deserves to be captured beautifully.\n\nCan we chat soon?\n\nXoxo,\nSarah",
    tone: 'friendly' as const,
    stage: 'booking' as const,
    confidence: 0.85,
    wordCount: 28,
    estimatedReadTime: '1 min read',
    mobileOptimized: true,
    touchFriendly: true,
  },
  {
    id: 'template-3',
    subject: 'Your wedding photography journey starts here',
    content:
      'Dear John,\n\nWhat an honor it would be to document your wedding day. Every couple has a unique story, and I specialize in telling those stories through authentic, emotional photography.\n\nWarmly,\nSarah',
    tone: 'warm' as const,
    stage: 'booking' as const,
    confidence: 0.88,
    wordCount: 42,
    estimatedReadTime: '2 min read',
    mobileOptimized: true,
    touchFriendly: true,
  },
];

// Mock touch events helper
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
  changedTouches?: Array<{ clientX: number; clientY: number }>,
) => {
  const touchList = touches.map(
    (touch, index) =>
      ({
        identifier: index,
        target: document.body,
        clientX: touch.clientX,
        clientY: touch.clientY,
        pageX: touch.clientX,
        pageY: touch.clientY,
        screenX: touch.clientX,
        screenY: touch.clientY,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1,
      }) as Touch,
  );

  return new TouchEvent(type, {
    touches: type === 'touchend' ? [] : touchList,
    changedTouches: (changedTouches || touches).map(
      (touch, index) =>
        ({
          identifier: index,
          target: document.body,
          clientX: touch.clientX,
          clientY: touch.clientY,
          pageX: touch.clientX,
          pageY: touch.clientY,
          screenX: touch.clientX,
          screenY: touch.clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1,
        }) as Touch,
    ),
    bubbles: true,
    cancelable: true,
  });
};

describe('TouchOptimizedVariantSelector', () => {
  const mockOnTemplateSelect = jest.fn();
  const mockOnTemplateEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with template data correctly', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      expect(screen.getByText('Template 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('90% confidence')).toBeInTheDocument();
      expect(
        screen.getByText('Thank you for your inquiry!'),
      ).toBeInTheDocument();
    });

    it('displays navigation dots for all templates', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const dots = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-2 h-2'));
      expect(dots).toHaveLength(3);
    });

    it('shows confidence level with appropriate color coding', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const confidenceIndicator = screen.getByText('90% confidence');
      expect(confidenceIndicator).toHaveClass('text-green-600', 'bg-green-50');
    });

    it('displays template metadata correctly', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      expect(screen.getByText('1 min read')).toBeInTheDocument();
      expect(screen.getByText('35 words')).toBeInTheDocument();
      expect(screen.getByText('professional tone')).toBeInTheDocument();
    });

    it('renders empty state when no templates provided', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={[]}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      expect(
        screen.getByText('No templates generated yet'),
      ).toBeInTheDocument();
    });
  });

  describe('Touch Navigation', () => {
    it('navigates to next template on left swipe', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const swipeableArea = container.querySelector(
        '.relative.overflow-hidden',
      );
      expect(swipeableArea).toBeInTheDocument();

      if (swipeableArea) {
        // Simulate left swipe (next template)
        fireEvent(
          swipeableArea,
          createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]),
        );
        fireEvent(
          swipeableArea,
          createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }]),
        );
      }

      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(25);
        expect(screen.getByText('Template 2 of 3')).toBeInTheDocument();
      });
    });

    it('navigates to previous template on right swipe', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Start at template 2
      const dots = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-2 h-2'));
      await userEvent.click(dots[1]);

      expect(screen.getByText('Template 2 of 3')).toBeInTheDocument();

      const swipeableArea = container.querySelector(
        '.relative.overflow-hidden',
      );
      if (swipeableArea) {
        // Simulate right swipe (previous template)
        fireEvent(
          swipeableArea,
          createTouchEvent('touchstart', [{ clientX: 50, clientY: 100 }]),
        );
        fireEvent(
          swipeableArea,
          createTouchEvent('touchend', [{ clientX: 200, clientY: 100 }]),
        );
      }

      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(25);
        expect(screen.getByText('Template 1 of 3')).toBeInTheDocument();
      });
    });

    it('handles navigation dot clicks with haptic feedback', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const dots = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-2 h-2'));

      await userEvent.click(dots[2]); // Click third dot

      expect(navigator.vibrate).toHaveBeenCalledWith(25);
      expect(screen.getByText('Template 3 of 3')).toBeInTheDocument();
    });

    it('provides visual feedback during drag gesture', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const swipeableArea = container.querySelector(
        '.relative.overflow-hidden',
      );
      if (swipeableArea) {
        fireEvent(
          swipeableArea,
          createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]),
        );
        fireEvent(
          swipeableArea,
          createTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }]),
        );

        // Template should show drag offset
        const templateContent = container.querySelector(
          '[style*="translateX"]',
        );
        expect(templateContent).toBeInTheDocument();

        fireEvent(
          swipeableArea,
          createTouchEvent('touchend', [{ clientX: 150, clientY: 100 }]),
        );
      }
    });
  });

  describe('Pinch to Zoom', () => {
    it('handles pinch zoom gesture on template content', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const templateContent = container.querySelector('[style*="scale"]');
      expect(templateContent).toBeInTheDocument();

      if (templateContent) {
        // Simulate pinch zoom
        fireEvent(
          templateContent,
          createTouchEvent('touchstart', [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 200 },
          ]),
        );

        fireEvent(
          templateContent,
          createTouchEvent('touchmove', [
            { clientX: 80, clientY: 80 },
            { clientX: 220, clientY: 220 },
          ]),
        );

        fireEvent(
          templateContent,
          createTouchEvent('touchend', [
            { clientX: 80, clientY: 80 },
            { clientX: 220, clientY: 220 },
          ]),
        );
      }

      await waitFor(() => {
        const zoomResetButton = screen.queryByText(/reset zoom/i);
        expect(zoomResetButton).toBeInTheDocument();
      });
    });

    it('shows zoom reset button when zoomed', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const templateContent = container.querySelector('[style*="scale"]');
      if (templateContent) {
        // Simulate zoom
        fireEvent(
          templateContent,
          createTouchEvent('touchstart', [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 200 },
          ]),
        );
      }

      const resetButton = await screen.findByText(/reset zoom/i);
      await userEvent.click(resetButton);

      // Zoom should reset
      expect(templateContent).toHaveStyle(
        'transform: translateX(0px) scale(1)',
      );
    });
  });

  describe('Long Press Interactions', () => {
    it('opens detail view on long press with haptic feedback', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const templateCard = container.querySelector('.relative.overflow-hidden');
      expect(templateCard).toBeInTheDocument();

      if (templateCard) {
        // Simulate long press
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );

        // Wait for long press duration (800ms)
        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(100); // Heavy haptic
        expect(screen.getByText('Template Details')).toBeInTheDocument();
      });
    });

    it('cancels long press on touch move', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );
        fireEvent(
          templateCard,
          createTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }]),
        );

        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      // Detail view should not open
      expect(screen.queryByText('Template Details')).not.toBeInTheDocument();
    });
  });

  describe('Double Tap Quick Select', () => {
    it('selects template on double click', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent.doubleClick(templateCard);
      }

      expect(mockOnTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50]); // Success haptic
    });
  });

  describe('A/B Testing Selection', () => {
    it('toggles A/B testing selection', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const abTestingButton = screen.getByRole('button', {
        name: /a\/b testing/i,
      });
      await userEvent.click(abTestingButton);

      expect(navigator.vibrate).toHaveBeenCalledWith(25);
      expect(
        screen.getByText(/A\/B Testing: 1 template selected/),
      ).toBeInTheDocument();
    });

    it('limits A/B selection to maximum 3 templates', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Select first template for A/B testing
      const abButton = screen.getByRole('button', { name: /a\/b testing/i });
      await userEvent.click(abButton);

      // Navigate to second template and select
      const nextDot = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-2 h-2'))[1];
      await userEvent.click(nextDot);
      await userEvent.click(
        screen.getByRole('button', { name: /a\/b testing/i }),
      );

      // Navigate to third template and select
      const thirdDot = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-2 h-2'))[2];
      await userEvent.click(thirdDot);
      await userEvent.click(
        screen.getByRole('button', { name: /a\/b testing/i }),
      );

      expect(
        screen.getByText(/A\/B Testing: 3 templates selected/),
      ).toBeInTheDocument();
    });

    it('clears A/B selection', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Select template for A/B testing
      const abButton = screen.getByRole('button', { name: /a\/b testing/i });
      await userEvent.click(abButton);

      // Clear selection
      const clearButton = screen.getByRole('button', {
        name: /clear selection/i,
      });
      await userEvent.click(clearButton);

      expect(screen.queryByText(/A\/B Testing:/)).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('handles edit action', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const editButton = screen.getByText('Edit');
      await userEvent.click(editButton);

      expect(mockOnTemplateEdit).toHaveBeenCalledWith(mockTemplates[0]);
      expect(navigator.vibrate).toHaveBeenCalledWith(50); // Medium haptic
    });

    it('handles copy action', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const copyButton = screen.getByText('Copy');
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${mockTemplates[0].subject}\n\n${mockTemplates[0].content}`,
      );
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('handles share action when Web Share API is available', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const shareButton = screen.getByText('Share');
      await userEvent.click(shareButton);

      expect(navigator.share).toHaveBeenCalledWith({
        title: mockTemplates[0].subject,
        text: mockTemplates[0].content,
      });
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('handles save action with success feedback', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const saveButton = screen.getByText('Save');
      await userEvent.click(saveButton);

      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50]); // Success haptic
    });
  });

  describe('Primary Action', () => {
    it('triggers template selection with success feedback', async () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const useButton = screen.getByText('Use This Template');
      await userEvent.click(useButton);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50]);
    });
  });

  describe('Detail View Bottom Sheet', () => {
    it('displays detailed template information', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Trigger long press to open detail view
      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );
        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Template Details')).toBeInTheDocument();
        expect(screen.getByText('90% Confidence')).toBeInTheDocument();
        expect(screen.getByText('Professional')).toBeInTheDocument();
        expect(screen.getByText('Inquiry')).toBeInTheDocument();
      });
    });

    it('handles edit action from detail view', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Open detail view
      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );
        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      await waitFor(async () => {
        const editButton = screen.getByText('Edit Template');
        await userEvent.click(editButton);
        expect(mockOnTemplateEdit).toHaveBeenCalledWith(mockTemplates[0]);
      });
    });

    it('handles use action from detail view', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Open detail view
      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );
        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      await waitFor(async () => {
        const useButton = screen.getByText('Use Template');
        await userEvent.click(useButton);
        expect(mockOnTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
      });
    });

    it('closes detail view when close button clicked', async () => {
      const { container } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      // Open detail view
      const templateCard = container.querySelector('.relative.overflow-hidden');
      if (templateCard) {
        fireEvent(
          templateCard,
          createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]),
        );
        act(() => {
          jest.advanceTimersByTime(800);
        });
      }

      await waitFor(async () => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        await userEvent.click(closeButton);
      });

      expect(screen.queryByText('Template Details')).not.toBeInTheDocument();
    });
  });

  describe('Usage Hints', () => {
    it('displays helpful usage tips', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      expect(
        screen.getByText(/Swipe left\/right to navigate/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Pinch to zoom in\/out/)).toBeInTheDocument();
      expect(
        screen.getByText(/Double tap to use template/),
      ).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('handles large template sets efficiently', () => {
      const largeTemplateSet = Array(100)
        .fill(mockTemplates[0])
        .map((template, index) => ({
          ...template,
          id: `template-${index}`,
        }));

      render(
        <TouchOptimizedVariantSelector
          templates={largeTemplateSet}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      expect(screen.getByText('Template 1 of 100')).toBeInTheDocument();
    });

    it('prevents memory leaks on unmount', () => {
      const { unmount } = render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      unmount();

      // Should clear all timers and event listeners
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Touch Target Sizing', () => {
    it('ensures minimum touch target sizes for accessibility', () => {
      render(
        <TouchOptimizedVariantSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          onTemplateEdit={mockOnTemplateEdit}
        />,
      );

      const primaryButton = screen.getByText('Use This Template');
      expect(primaryButton).toHaveClass('min-h-[56px]'); // 48px + 8px padding

      const actionButtons = screen.getAllByText(/Edit|Copy|Share|Save/);
      actionButtons.forEach((button) => {
        expect(button.closest('button')).toHaveClass('min-h-[64px]'); // 48px + 16px
      });
    });
  });
});
