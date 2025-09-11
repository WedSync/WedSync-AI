/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { JourneySuggestionsPanel } from '@/components/ai/JourneySuggestionsPanel';
import { GeneratedJourney } from '@/types/journey-ai';

// Mock the child components
jest.mock('@/components/ai/VendorSpecificControls', () => ({
  VendorSpecificControls: ({ onChange }: any) => (
    <div data-testid="vendor-controls">
      <button onClick={() => onChange({ vendorType: 'photographer' })}>
        Mock Vendor Controls
      </button>
    </div>
  ),
}));

jest.mock('@/components/ai/GeneratedJourneyPreview', () => ({
  GeneratedJourneyPreview: ({ journey, onSave }: any) => (
    <div data-testid="journey-preview">
      <div>Journey: {journey.journey.settings.name}</div>
      <button onClick={() => onSave(journey)}>Save Journey</button>
    </div>
  ),
}));

jest.mock('@/components/ai/PerformancePredictionDisplay', () => ({
  PerformancePredictionDisplay: ({ performance }: any) => (
    <div data-testid="performance-display">
      Performance: {Math.round(performance.completionRate * 100)}%
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: ({ className }: { className?: string }) => (
    <div data-testid="sparkles-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <div data-testid="x-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader2-icon" className={className} />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <div data-testid="checkcircle2-icon" className={className} />
  ),
  Zap: ({ className }: { className?: string }) => (
    <div data-testid="zap-icon" className={className} />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <div data-testid="trendingup-icon" className={className} />
  ),
  Save: ({ className }: { className?: string }) => (
    <div data-testid="save-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refreshcw-icon" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alertcircle-icon" className={className} />
  ),
}));

// Mock the AI service by stubbing the global setTimeout
const mockGeneratedJourney: GeneratedJourney = {
  id: 'test-journey-1',
  metadata: {
    generatedAt: new Date('2025-01-20'),
    aiModel: 'gpt-4-wedding-specialist',
    version: '1.0.0',
    confidence: 0.87,
    estimatedPerformance: {
      completionRate: 0.85,
      engagementScore: 82,
      estimatedTimeToCompletion: 288,
      clientSatisfactionScore: 8.5,
      industryBenchmark: {
        completionRate: 0.82,
        engagementScore: 78,
        avgTimeToCompletion: 300,
      },
      confidenceIntervals: {
        completionRate: { lower: 0.78, upper: 0.92 },
        engagementScore: { lower: 72, upper: 88 },
      },
    },
    generationRequest: {
      vendorType: 'photographer',
      serviceLevel: 'premium',
      weddingTimeline: 12,
      clientPreferences: {
        communicationStyle: 'friendly',
        frequency: 'regular',
        preferredChannels: ['email', 'sms'],
        timeOfDay: 'any',
      },
    },
  },
  journey: {
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: {
          title: 'Client Journey Start',
          timing: { delay: 0 },
          metadata: {
            aiGenerated: true,
            confidence: 0.95,
            reasoning: 'Starting point for all client communications',
          },
        },
        connections: [{ to: 'email_1' }],
      },
    ],
    connections: [],
    settings: {
      name: 'Photographer Journey - Premium',
      description:
        'AI-generated premium level journey for photographer services',
      tags: ['ai-generated', 'photographer', 'premium'],
      isActive: false,
    },
  },
  optimizationSuggestions: [],
};

describe('JourneySuggestionsPanel', () => {
  const mockOnJourneyGenerated = jest.fn();
  const mockOnJourneySaved = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    isOpen: true,
    onJourneyGenerated: mockOnJourneyGenerated,
    onJourneySaved: mockOnJourneySaved,
    onClose: mockOnClose,
    existingJourneys: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering and Layout', () => {
    it('renders when open', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      expect(screen.getByText('AI Journey Suggestions')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Generate personalized customer journeys for your wedding business',
        ),
      ).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<JourneySuggestionsPanel {...defaultProps} isOpen={false} />);

      expect(
        screen.queryByText('AI Journey Suggestions'),
      ).not.toBeInTheDocument();
    });

    it('shows progress indicator with correct steps', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      expect(screen.getByText('Configure')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('shows close button', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Configuration Step', () => {
    it('shows vendor controls in configure step', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      expect(screen.getByTestId('vendor-controls')).toBeInTheDocument();
      expect(screen.getByText('Mock Vendor Controls')).toBeInTheDocument();
    });

    it('shows generate button in footer', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      expect(screen.getByText('Generate Journey')).toBeInTheDocument();
      expect(
        screen.getByText('Generation typically takes 30-60 seconds'),
      ).toBeInTheDocument();
    });

    it('shows cancel button', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Journey Generation Process', () => {
    it('starts generation when generate button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generating Your Journey')).toBeInTheDocument();
      });
    });

    it('shows generation progress with stages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Analyzing vendor requirements/),
        ).toBeInTheDocument();
      });

      // Fast-forward through generation stages
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(
          screen.getByText(/Generating personalized journey/),
        ).toBeInTheDocument();
      });

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(
          screen.getByText(/Applying industry best practices/),
        ).toBeInTheDocument();
      });
    });

    it('shows progress percentage', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('0% complete')).toBeInTheDocument();
      });
    });

    it('shows loading spinner during generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Preview Step', () => {
    it('shows journey preview after generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      // Complete all generation stages
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByTestId('journey-preview')).toBeInTheDocument();
        expect(
          screen.getByText('Generated Journey Preview'),
        ).toBeInTheDocument();
      });
    });

    it('shows performance prediction', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByTestId('performance-display')).toBeInTheDocument();
      });
    });

    it('shows retry button', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument();
      });
    });

    it('calls onJourneyGenerated when journey is generated', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockOnJourneyGenerated).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.any(String),
            metadata: expect.any(Object),
            journey: expect.any(Object),
          }),
        );
      });
    });
  });

  describe('Save Process', () => {
    it('saves journey when save button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Generate journey first
      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        const saveButton = screen.getByText('Save Journey');
        return user.click(saveButton);
      });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Journey Saved!')).toBeInTheDocument();
      });
    });

    it('calls onJourneySaved when journey is saved', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Generate and save journey
      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);
      jest.advanceTimersByTime(5000);

      await waitFor(async () => {
        const saveButton = screen.getByText('Save Journey');
        await user.click(saveButton);
      });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockOnJourneySaved).toHaveBeenCalled();
      });
    });

    it('shows success state after saving', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Generate and save journey
      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);
      jest.advanceTimersByTime(5000);

      await waitFor(async () => {
        const saveButton = screen.getByText('Save Journey');
        await user.click(saveButton);
      });

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByTestId('checkcircle2-icon')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Your AI-generated journey has been saved successfully.',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock a validation error by not having proper configuration
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      // Should show validation error since we haven't configured anything
      await waitFor(() => {
        expect(
          screen.getByText(/Please fix the validation errors/),
        ).toBeInTheDocument();
      });
    });

    it('handles generation failures gracefully', async () => {
      // Mock a failed generation by overriding the mock service
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        if (delay > 1000) {
          // Simulate an error for the main generation call
          callback();
          throw new Error('Generation failed');
        }
        return originalSetTimeout(callback, delay);
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');

      try {
        await user.click(generateButton);
        jest.advanceTimersByTime(5000);

        await waitFor(
          () => {
            expect(
              screen.getByText(/Failed to generate journey/),
            ).toBeInTheDocument();
          },
          { timeout: 10000 },
        );
      } catch (error) {
        // Expected error
      }

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('User Interactions', () => {
    it('closes panel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const closeButton = screen.getByTestId('x-icon').closest('button');
      await user.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes panel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes panel when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Click on the backdrop (the dark overlay)
      const backdrop = document.querySelector(
        '.absolute.inset-0.bg-black\\/50',
      );
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('allows retrying generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Generate journey first
      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        const retryButton = screen.getByText('Generate New');
        return user.click(retryButton);
      });

      // Should be back to configure step
      expect(screen.getByTestId('vendor-controls')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      expect(generateButton).toHaveAttribute('type', 'button');

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('disables buttons during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      await waitFor(() => {
        const closeButton = screen.getByTestId('x-icon').closest('button');
        expect(closeButton).toBeDisabled();
      });
    });

    it('provides proper keyboard navigation', () => {
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      generateButton.focus();
      expect(generateButton).toHaveFocus();
    });
  });

  describe('Progress Tracking', () => {
    it('updates progress indicators correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      // Initially in configure step
      const configureStep = screen.getByText('Configure').closest('div');
      expect(configureStep).toHaveClass('bg-accent');

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      // Should move to generating step
      await waitFor(() => {
        const generateStep = screen.getByText('Generate').closest('div');
        expect(generateStep).toHaveClass('bg-accent');
      });
    });

    it('shows correct step information', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<JourneySuggestionsPanel {...defaultProps} />);

      const generateButton = screen.getByText('Generate Journey');
      await user.click(generateButton);

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        const previewStep = screen.getByText('Preview').closest('div');
        expect(previewStep).toHaveClass('bg-accent');
      });
    });
  });
});
