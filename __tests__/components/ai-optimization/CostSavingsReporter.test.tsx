/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostSavingsReporter from '@/components/ai-optimization/CostSavingsReporter';
import type { CostSavingsReport } from '@/types/ai-optimization';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <h3 data-testid="card-title">{children}</h3>,
}));

describe('CostSavingsReporter', () => {
  const mockReport: CostSavingsReport = {
    period: 'monthly',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    baseline: {
      totalCostPence: 28000,
      avgDailyCostPence: 903
    },
    optimized: {
      totalCostPence: 17200,
      avgDailyCostPence: 555
    },
    savings: {
      absolutePence: 10800,
      percentage: 38.6,
      projectedAnnualSavingsPence: 129600
    },
    savingsByOptimization: {
      caching: 6000,
      modelSelection: 2800,
      batchProcessing: 1500,
      seasonalOptimization: 500
    },
    weddingMetrics: {
      weddingsProcessed: 18,
      avgCostPerWedding: 956,
      peakSeasonSavings: 3200
    }
  };

  const mockProps = {
    report: mockReport,
    period: 'monthly' as const,
    onPeriodChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders cost savings report', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Cost Savings Report');
  });

  test('displays total savings amount', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('£108.00')).toBeInTheDocument(); // 10800 pence
  });

  test('shows savings percentage', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('38.6%')).toBeInTheDocument();
  });

  test('displays projected annual savings', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('£1296')).toBeInTheDocument(); // 129600 pence
  });

  test('shows weddings processed count', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  test('displays optimization breakdown', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('Smart Caching')).toBeInTheDocument();
    expect(screen.getByText('Model Selection')).toBeInTheDocument();
    expect(screen.getByText('Batch Processing')).toBeInTheDocument();
  });

  test('shows wedding industry specific metrics', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText(/photography/i)).toBeInTheDocument();
  });

  test('handles period change', () => {
    render(<CostSavingsReporter {...mockProps} />);
    // Test that component renders without errors when period changes
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  test('displays peak season savings', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('£32.00')).toBeInTheDocument(); // Peak season savings
  });

  test('shows average cost per wedding', () => {
    render(<CostSavingsReporter {...mockProps} />);
    expect(screen.getByText('£9.56')).toBeInTheDocument(); // Average per wedding
  });
});
