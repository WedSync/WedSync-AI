import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import CohortAnalysisHeatmap from '@/components/admin/analytics/CohortAnalysisHeatmap';
import { CohortData } from '@/types/cohort-analysis';

// Mock data for testing
const mockCohortData: CohortData[] = [
  {
    cohort_start: '2024-01-01',
    cohort_size: 156,
    retention_rates: [1.0, 0.89, 0.82, 0.78, 0.75, 0.72],
    revenue_progression: [45000, 52000, 58000, 62000, 65000, 68000],
    ltv_calculated: 4850,
    seasonal_cohort: 'Q1',
    months_tracked: 6
  },
  {
    cohort_start: '2024-02-01',
    cohort_size: 142,
    retention_rates: [1.0, 0.91, 0.85, 0.81, 0.78, 0.75],
    revenue_progression: [48000, 55000, 61000, 66000, 69000, 72000],
    ltv_calculated: 5120,
    seasonal_cohort: 'Q1',
    months_tracked: 6
  }
];

describe('CohortAnalysisHeatmap', () => {
  const defaultProps = {
    cohortData: mockCohortData,
    selectedMetric: 'retention' as const,
    timeRange: 6,
    onCohortSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully with required props', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    expect(screen.getByText('Cohort Analysis Heatmap - RETENTION')).toBeInTheDocument();
    expect(screen.getByText('Supplier retention rates by signup cohort and time period')).toBeInTheDocument();
  });

  it('displays correct month headers based on time range', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Month ${i}`)).toBeInTheDocument();
    }
  });

  it('displays cohort labels correctly formatted', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    expect(screen.getByText('Feb 2024')).toBeInTheDocument();
  });

  it('shows retention percentages in cells when metric is retention', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    // First cohort, first month should show 100.0%
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    // First cohort, second month should show 89.0%
    expect(screen.getByText('89.0%')).toBeInTheDocument();
  });

  it('shows revenue values when metric is revenue', () => {
    const revenueProps = {
      ...defaultProps,
      selectedMetric: 'revenue' as const
    };
    
    render(<CohortAnalysisHeatmap {...revenueProps} />);
    
    expect(screen.getByText('Cohort Analysis Heatmap - REVENUE')).toBeInTheDocument();
    expect(screen.getByText('Revenue performance by cohort over time')).toBeInTheDocument();
    // Revenue should be displayed in thousands (45000 -> 45.0k)
    expect(screen.getByText('45.0k')).toBeInTheDocument();
  });

  it('shows LTV values when metric is ltv', () => {
    const ltvProps = {
      ...defaultProps,
      selectedMetric: 'ltv' as const
    };
    
    render(<CohortAnalysisHeatmap {...ltvProps} />);
    
    expect(screen.getByText('Cohort Analysis Heatmap - LTV')).toBeInTheDocument();
    expect(screen.getByText('Lifetime value analysis by cohort progression')).toBeInTheDocument();
  });

  it('applies correct color classes based on performance', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    // High retention (100%) should have success colors
    const highPerformanceCell = screen.getByText('100.0%').closest('div');
    expect(highPerformanceCell).toHaveClass('bg-success-500');
    
    // Lower retention should have different colors
    const lowerPerformanceCell = screen.getByText('72.0%').closest('div');
    expect(lowerPerformanceCell).toHaveClass('bg-success-300');
  });

  it('handles cell click and calls onCohortSelect', () => {
    const onCohortSelectMock = vi.fn();
    const props = {
      ...defaultProps,
      onCohortSelect: onCohortSelectMock
    };
    
    render(<CohortAnalysisHeatmap {...props} />);
    
    // Click on a cell
    const cell = screen.getByText('100.0%');
    fireEvent.click(cell);
    
    expect(onCohortSelectMock).toHaveBeenCalledWith(mockCohortData[0]);
  });

  it('shows tooltip on hover', async () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    const cell = screen.getByText('100.0%');
    fireEvent.mouseEnter(cell);
    
    await waitFor(() => {
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('Month 1')).toBeInTheDocument();
      expect(screen.getByText('Value: 100.0%')).toBeInTheDocument();
      expect(screen.getByText('Cohort Size: 156')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    const cell = screen.getByText('100.0%');
    fireEvent.mouseEnter(cell);
    
    await waitFor(() => {
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    });
    
    fireEvent.mouseLeave(cell);
    
    await waitFor(() => {
      expect(screen.queryByText('2024-01-01')).not.toBeInTheDocument();
    });
  });

  it('displays performance legend correctly', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    expect(screen.getByText('Performance Legend')).toBeInTheDocument();
    expect(screen.getByText('Excellent (80%+)')).toBeInTheDocument();
    expect(screen.getByText('Good (60-80%)')).toBeInTheDocument();
    expect(screen.getByText('Fair (40-60%)')).toBeInTheDocument();
    expect(screen.getByText('Poor (20-40%)')).toBeInTheDocument();
    expect(screen.getByText('Critical (<20%)')).toBeInTheDocument();
  });

  it('handles empty cohort data gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      cohortData: []
    };
    
    render(<CohortAnalysisHeatmap {...emptyProps} />);
    
    expect(screen.getByText('Cohort Analysis Heatmap - RETENTION')).toBeInTheDocument();
    expect(screen.getByText('Cohort Start')).toBeInTheDocument();
  });

  it('limits time range correctly', () => {
    const limitedTimeProps = {
      ...defaultProps,
      timeRange: 3
    };
    
    render(<CohortAnalysisHeatmap {...limitedTimeProps} />);
    
    expect(screen.getByText('Month 1')).toBeInTheDocument();
    expect(screen.getByText('Month 2')).toBeInTheDocument();
    expect(screen.getByText('Month 3')).toBeInTheDocument();
    expect(screen.queryByText('Month 4')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-heatmap-class';
    const props = {
      ...defaultProps,
      className: customClass
    };
    
    const { container } = render(<CohortAnalysisHeatmap {...props} />);
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles hover effects correctly', () => {
    render(<CohortAnalysisHeatmap {...defaultProps} />);
    
    const cell = screen.getByText('100.0%');
    
    // Cell should have hover classes
    expect(cell).toHaveClass('hover:scale-105');
    expect(cell).toHaveClass('hover:shadow-md');
  });

  it('sorts cohorts by date correctly', () => {
    const unsortedData = [
      {
        cohort_start: '2024-03-01',
        cohort_size: 100,
        retention_rates: [1.0, 0.8],
        revenue_progression: [50000, 45000],
        ltv_calculated: 4000,
        seasonal_cohort: 'Q1' as const,
        months_tracked: 2
      },
      {
        cohort_start: '2024-01-01',
        cohort_size: 150,
        retention_rates: [1.0, 0.9],
        revenue_progression: [45000, 50000],
        ltv_calculated: 5000,
        seasonal_cohort: 'Q1' as const,
        months_tracked: 2
      }
    ];
    
    const props = {
      ...defaultProps,
      cohortData: unsortedData,
      timeRange: 2
    };
    
    render(<CohortAnalysisHeatmap {...props} />);
    
    // Should display Jan before Mar
    const cohortLabels = screen.getAllByText(/Jan|Mar/);
    expect(cohortLabels[0]).toHaveTextContent('Jan 2024');
    expect(cohortLabels[1]).toHaveTextContent('Mar 2024');
  });
});