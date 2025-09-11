/**
 * AIWeddingOptimizer Component Tests
 * Team A: Frontend/UI Development - WS-341
 *
 * Comprehensive test suite for the AI Wedding Optimizer component
 * Tests all functionality, interactions, and edge cases
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

import { AIWeddingOptimizer } from '@/components/ai/AIWeddingOptimizer';
import { useAIOptimization } from '@/hooks/ai/useAIOptimization';
import type {
  AIWeddingOptimizerProps,
  CouplePreferences,
  WeddingBudget,
  WeddingTimeline,
  OptimizationResult,
  AIRecommendation,
  OptimizationRequest,
  AIFeedback,
} from '@/types/ai-wedding-optimization';

// Mock the useAIOptimization hook
vi.mock('@/hooks/ai/useAIOptimization');
const mockUseAIOptimization = useAIOptimization as any;

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className} data-testid="card-title">
      {children}
    </h3>
  ),
}));

// Mock data for testing
const mockCouplePreferences: CouplePreferences = {
  priorities: [
    { category: 'photography', importance: 9, flexibility: 'rigid' },
    { category: 'venue', importance: 8, flexibility: 'flexible' },
  ],
  style: {
    theme: 'rustic',
    colors: ['rose', 'gold', 'ivory'],
    formality: 'semi-formal',
  },
  preferences: {
    photography: ['candid', 'outdoor'],
    catering: ['vegetarian options'],
    music: ['acoustic', 'live band'],
    flowers: ['roses', 'eucalyptus'],
  },
  dealBreakers: ['no outdoor ceremony'],
  mustHaves: ['professional photography', 'live music'],
};

const mockBudget: WeddingBudget = {
  id: 'budget-1',
  total: 25000,
  allocated: 20000,
  spent: 5000,
  remaining: 15000,
  categories: [
    {
      id: 'cat-1',
      name: 'photography',
      allocated: 5000,
      spent: 2000,
      percentage: 20,
      priority: 1,
      flexibility: 'rigid',
    },
    {
      id: 'cat-2',
      name: 'venue',
      allocated: 8000,
      spent: 3000,
      percentage: 32,
      priority: 2,
      flexibility: 'flexible',
    },
  ],
  currency: 'GBP',
  lastUpdated: new Date('2024-01-15'),
};

const mockTimeline: WeddingTimeline = {
  id: 'timeline-1',
  events: [
    {
      id: 'event-1',
      title: 'Wedding Ceremony',
      description: 'Main wedding ceremony',
      startTime: new Date('2024-08-15T14:00:00'),
      endTime: new Date('2024-08-15T15:00:00'),
      category: 'ceremony',
      priority: 1,
      flexibility: 'fixed',
      vendorIds: ['vendor-1'],
      dependencies: [],
    },
  ],
  dependencies: [],
  conflicts: [],
  optimizationSuggestions: [],
};

const mockRecommendation: AIRecommendation = {
  id: 'rec-1',
  optimizationId: 'opt-1',
  title: 'Budget Optimization Opportunity',
  summary: 'Save £1,500 on catering by choosing a different menu style',
  detailedAnalysis:
    'Based on your preferences and guest count, switching to a buffet style could save significant costs while maintaining quality.',
  category: 'budget',
  type: 'cost_reduction',
  impact: 'high',
  confidence: 85,
  status: 'pending',
  potentialSavings: 1500,
  timeSavings: 5,
  stressReduction: 20,
  implementationTime: '2-3 days',
  benefits: ['Lower catering costs', 'More menu variety', 'Faster service'],
  risks: ['Less formal presentation'],
  alternatives: [
    {
      id: 'alt-1',
      title: 'Hybrid service style',
      description: 'Combination of plated and buffet service',
      cost: 7500,
      savings: 750,
      confidence: 75,
      pros: ['Balance of formal and casual'],
      cons: ['More complex coordination'],
    },
  ],
  priority: 8,
  createdAt: new Date('2024-01-15T10:00:00'),
};

const mockOptimizationResult: OptimizationResult = {
  id: 'opt-1',
  type: 'comprehensive',
  status: 'completed',
  recommendations: [mockRecommendation],
  metrics: {
    totalSavings: 1500,
    timeSavings: 5,
    stressReduction: 20,
    decisionSpeed: 40,
    confidenceScore: 85,
    acceptanceRate: 80,
    implementationSuccess: 90,
  },
  createdAt: new Date('2024-01-15T09:00:00'),
};

const mockProps: AIWeddingOptimizerProps = {
  weddingId: 'wedding-123',
  couplePreferences: mockCouplePreferences,
  budget: mockBudget,
  timeline: mockTimeline,
  currentOptimizations: [mockOptimizationResult],
  onOptimizationRequest: vi.fn(),
  onAcceptRecommendation: vi.fn(),
  onFeedback: vi.fn(),
  isOptimizing: false,
};

const mockUseAIOptimizationReturn = {
  optimizations: [],
  isOptimizing: false,
  optimizationHistory: [],
  error: null,
  startOptimization: vi.fn(),
  acceptRecommendation: vi.fn(),
  declineRecommendation: vi.fn(),
  getPersonalizedRecommendations: vi.fn(),
};

describe('AIWeddingOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAIOptimization.mockReturnValue(mockUseAIOptimizationReturn);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the main AI optimization interface correctly', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(screen.getByText('AI Wedding Optimizer')).toBeInTheDocument();
      expect(
        screen.getByText('Intelligent optimization for your perfect wedding'),
      ).toBeInTheDocument();
      expect(screen.getByText('Start AI Optimization')).toBeInTheDocument();
    });

    it('displays all optimization categories', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(screen.getByText('Budget Optimization')).toBeInTheDocument();
      expect(screen.getByText('Timeline Optimization')).toBeInTheDocument();
      expect(screen.getByText('Vendor Matching')).toBeInTheDocument();
      expect(screen.getByText('Experience Enhancement')).toBeInTheDocument();
    });

    it('shows optimization category benefits', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(screen.getByText('up to 30%')).toBeInTheDocument(); // Budget savings
      expect(screen.getByText('40+ hours')).toBeInTheDocument(); // Time savings
      expect(screen.getByText('95%')).toBeInTheDocument(); // Match accuracy
      expect(screen.getByText('90%+')).toBeInTheDocument(); // Satisfaction boost
    });

    it('displays recommendations when available', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
      expect(screen.getByText('1 Active Optimizations')).toBeInTheDocument();
      expect(
        screen.getByText('Budget Optimization Opportunity'),
      ).toBeInTheDocument();
    });

    it('shows placeholder when no recommendations are available', () => {
      const propsWithoutOptimizations = {
        ...mockProps,
        currentOptimizations: [],
      };

      render(<AIWeddingOptimizer {...propsWithoutOptimizations} />);

      expect(
        screen.getByText('Ready to optimize your wedding?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Let our AI analyze your wedding plans'),
      ).toBeInTheDocument();
    });
  });

  describe('Optimization Request Handling', () => {
    it('handles optimization request correctly', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const optimizeButton = screen.getByText('Start AI Optimization');
      await user.click(optimizeButton);

      await waitFor(() => {
        expect(mockProps.onOptimizationRequest).toHaveBeenCalledWith({
          type: 'comprehensive',
          priority: 'high',
        });
      });
    });

    it('handles category-specific optimization requests', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const budgetCategory = screen.getByText('Budget Optimization');
      await user.click(budgetCategory);

      const optimizeButton = screen.getByText('Start AI Optimization');
      await user.click(optimizeButton);

      await waitFor(() => {
        expect(mockProps.onOptimizationRequest).toHaveBeenCalledWith({
          type: 'budget',
          priority: 'high',
        });
      });
    });

    it('shows loading state during optimization', () => {
      const propsWithLoading = {
        ...mockProps,
        isOptimizing: true,
      };

      render(<AIWeddingOptimizer {...propsWithLoading} />);

      expect(screen.getByText('Optimizing...')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /optimizing/i }),
      ).toBeDisabled();
    });
  });

  describe('Recommendation Interactions', () => {
    it('handles recommendation acceptance', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const acceptButton = screen.getByText('Accept');
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockProps.onAcceptRecommendation).toHaveBeenCalledWith(
          mockRecommendation,
        );
      });
    });

    it('handles recommendation decline', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const declineButton = screen.getByText('Decline');
      await user.click(declineButton);

      await waitFor(() => {
        expect(mockProps.onFeedback).toHaveBeenCalledWith({
          recommendationId: mockRecommendation.id,
          type: 'negative',
          reason: 'Not interested',
        });
      });
    });

    it('shows recommendation details when requested', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const detailsButton = screen.getByText('More Details');
      await user.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('Detailed Analysis')).toBeInTheDocument();
        expect(
          screen.getByText('Based on your preferences and guest count'),
        ).toBeInTheDocument();
      });
    });

    it('displays recommendation alternatives', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const detailsButton = screen.getByText('More Details');
      await user.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('Alternative Options')).toBeInTheDocument();
        expect(screen.getByText('Hybrid service style')).toBeInTheDocument();
      });
    });
  });

  describe('Category Selection', () => {
    it('updates selected optimization category', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      const timelineCategory = screen.getByText('Timeline Optimization');
      await user.click(timelineCategory);

      // Check if the category is visually selected (would have different styling)
      const categoryCard = timelineCategory.closest('[data-testid="card"]');
      expect(categoryCard).toHaveClass('border-rose-500', 'bg-rose-50');
    });

    it('shows different benefits for each category', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      const budgetCard = screen
        .getByText('Budget Optimization')
        .closest('[data-testid="card"]');
      const timelineCard = screen
        .getByText('Timeline Optimization')
        .closest('[data-testid="card"]');
      const vendorCard = screen
        .getByText('Vendor Matching')
        .closest('[data-testid="card"]');
      const experienceCard = screen
        .getByText('Experience Enhancement')
        .closest('[data-testid="card"]');

      expect(within(budgetCard!).getByText('up to 30%')).toBeInTheDocument();
      expect(within(timelineCard!).getByText('40+ hours')).toBeInTheDocument();
      expect(within(vendorCard!).getByText('95%')).toBeInTheDocument();
      expect(within(experienceCard!).getByText('90%+')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages from the hook', () => {
      const mockError = new Error('Optimization failed');
      mockUseAIOptimization.mockReturnValue({
        ...mockUseAIOptimizationReturn,
        error: mockError,
      });

      render(<AIWeddingOptimizer {...mockProps} />);

      expect(
        screen.getByText('Error: Optimization failed'),
      ).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const user = userEvent.setup();

      const propsWithError = {
        ...mockProps,
        onOptimizationRequest: vi
          .fn()
          .mockRejectedValue(new Error('API Error')),
      };

      render(<AIWeddingOptimizer {...propsWithError} />);

      const optimizeButton = screen.getByText('Start AI Optimization');
      await user.click(optimizeButton);

      // The component should handle the error without crashing
      expect(screen.getByText('AI Wedding Optimizer')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AIWeddingOptimizer {...mockProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(document.activeElement).not.toBe(document.body);

      await user.tab();
      expect(document.activeElement).not.toBe(document.body);
    });

    it('provides meaningful text for screen readers', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(
        screen.getByText('Intelligent optimization for your perfect wedding'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Smart cost management and savings'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Perfect scheduling and coordination'),
      ).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders correctly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AIWeddingOptimizer {...mockProps} />);

      // Check that mobile-specific classes are applied
      const container = screen.getByText('AI Wedding Optimizer').closest('div');
      expect(container).toHaveClass('min-h-screen');
    });

    it('adjusts grid layout for different screen sizes', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      // Check responsive grid classes
      const gridContainer = screen
        .getByText('Budget Optimization')
        .closest('.grid');
      expect(gridContainer).toHaveClass(
        'grid-cols-1',
        'md:grid-cols-2',
        'xl:grid-cols-4',
      );
    });
  });

  describe('Performance', () => {
    it('renders without performance warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<AIWeddingOptimizer {...mockProps} />);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles large datasets efficiently', () => {
      // Helper function to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const createMockRecommendation = (i: number, j: number) => ({
        ...mockRecommendation,
        id: `rec-${i}-${j}`,
      });

      const createMockOptimization = (i: number) => ({
        ...mockOptimizationResult,
        id: `opt-${i}`,
        recommendations: Array.from({ length: 10 }, (_, j) => 
          createMockRecommendation(i, j)
        ),
      });

      const largeOptimizations = Array.from({ length: 100 }, (_, i) =>
        createMockOptimization(i)
      );

      const propsWithLargeData = {
        ...mockProps,
        currentOptimizations: largeOptimizations,
      };

      const startTime = performance.now();
      render(<AIWeddingOptimizer {...propsWithLargeData} />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Integration', () => {
    it('integrates correctly with useAIOptimization hook', () => {
      const mockHistory = [
        {
          id: 'hist-1',
          weddingId: 'wedding-123',
          timestamp: new Date(),
          request: { type: 'budget' as const, priority: 'high' as const },
          result: mockOptimizationResult,
          status: 'completed' as const,
        },
      ];

      mockUseAIOptimization.mockReturnValue({
        ...mockUseAIOptimizationReturn,
        optimizationHistory: mockHistory,
      });

      render(<AIWeddingOptimizer {...mockProps} />);

      expect(mockUseAIOptimization).toHaveBeenCalledWith('wedding-123');
    });

    it('passes correct props to child components', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      // Verify that all required sections are rendered
      expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('Recent Optimizations')).toBeInTheDocument();
      expect(screen.getByText('AI Performance')).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Context', () => {
    it('displays wedding-specific terminology', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      expect(screen.getByText('wedding')).toBeInTheDocument();
      expect(screen.getByText('Budget Optimization')).toBeInTheDocument();
      expect(screen.getByText('Vendor Matching')).toBeInTheDocument();
    });

    it('shows wedding planning metrics', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      // Check for wedding-specific progress indicators
      expect(screen.getByText('Wedding Progress')).toBeInTheDocument();
      expect(screen.getByText('Budget Health')).toBeInTheDocument();
    });

    it('handles wedding-specific data correctly', () => {
      render(<AIWeddingOptimizer {...mockProps} />);

      // Check that wedding budget and timeline data is displayed
      expect(screen.getByText('£25,000')).toBeInTheDocument(); // Total budget
      expect(screen.getByText('65%')).toBeInTheDocument(); // Progress
    });
  });
});
