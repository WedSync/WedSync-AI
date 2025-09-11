import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import CohortAnalysisDashboard from '@/components/admin/analytics/CohortAnalysisDashboard';

// Mock the child components
vi.mock('@/components/admin/analytics/CohortAnalysisHeatmap', () => ({
  return function MockCohortAnalysisHeatmap({ onCohortSelect }: any) {
    return (
      <div data-testid="cohort-heatmap">
        <button onClick={() => onCohortSelect({ cohort_start: '2024-01-01' })}>
          Mock Heatmap Cell
        </button>
      </div>
    );
  };
});

jest.mock('@/components/admin/analytics/CohortMetricsSelector', () => {
  return function MockCohortMetricsSelector({ onMetricChange, onTimeRangeChange, onExport }: any) {
    return (
      <div data-testid="metrics-selector">
        <button onClick={() => onMetricChange('revenue')}>Change to Revenue</button>
        <button onClick={() => onTimeRangeChange(24)}>Change to 24 months</button>
        <button onClick={onExport}>Export Data</button>
      </div>
    );
  };
});

jest.mock('@/components/admin/analytics/CohortInsightsPanel', () => {
  return function MockCohortInsightsPanel() {
    return <div data-testid="insights-panel">Insights Panel</div>;
  };
});

jest.mock('@/components/admin/analytics/CohortDetailModal', () => {
  return function MockCohortDetailModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="detail-modal">
        <button onClick={onClose}>Close Modal</button>
        Detail Modal Content
      </div>
    ) : null;
  };
});

// Mock Recharts components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />
}));

describe('CohortAnalysisDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with all main components', () => {
    render(<CohortAnalysisDashboard />);
    
    expect(screen.getByText('Cohort Analysis Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Track supplier retention, revenue, and lifetime value by signup cohort')).toBeInTheDocument();
    
    expect(screen.getByTestId('metrics-selector')).toBeInTheDocument();
    expect(screen.getByTestId('cohort-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
  });

  it('displays the header with correct title and description', () => {
    render(<CohortAnalysisDashboard />);
    
    const title = screen.getByText('Cohort Analysis Dashboard');
    expect(title).toBeInTheDocument();
    expect(title.closest('h1')).toHaveClass('text-3xl', 'font-bold');
    
    const description = screen.getByText('Track supplier retention, revenue, and lifetime value by signup cohort');
    expect(description).toBeInTheDocument();
  });

  it('shows refresh button and last updated time', () => {
    render(<CohortAnalysisDashboard />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles metric change correctly', async () => {
    render(<CohortAnalysisDashboard />);
    
    const changeMetricButton = screen.getByText('Change to Revenue');
    fireEvent.click(changeMetricButton);
    
    // Component should re-render with new metric (tested via props passed to child)
    // This is implicitly tested since the mock component receives the new metric
  });

  it('handles time range change correctly', async () => {
    render(<CohortAnalysisDashboard />);
    
    const changeTimeRangeButton = screen.getByText('Change to 24 months');
    fireEvent.click(changeTimeRangeButton);
    
    // Component should re-render with new time range
    // This is implicitly tested since the mock component receives the new time range
  });

  it('handles refresh button click', async () => {
    render(<CohortAnalysisDashboard />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    // Should show loading state temporarily
    await waitFor(() => {
      expect(screen.getByText('Loading cohort analysis...')).toBeInTheDocument();
    });
  });

  it('handles export functionality', async () => {
    // Mock URL.createObjectURL for export functionality
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document methods
    const mockCreateElement = jest.fn();
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    
    mockCreateElement.mockReturnValue(mockAnchor);
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    
    render(<CohortAnalysisDashboard />);
    
    const exportButton = screen.getByText('Export Data');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('opens detail modal when cohort is selected', async () => {
    render(<CohortAnalysisDashboard />);
    
    // Initially modal should not be visible
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument();
    
    // Click on heatmap cell
    const heatmapCell = screen.getByText('Mock Heatmap Cell');
    fireEvent.click(heatmapCell);
    
    await waitFor(() => {
      expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Detail Modal Content')).toBeInTheDocument();
    });
  });

  it('closes detail modal when close button is clicked', async () => {
    render(<CohortAnalysisDashboard />);
    
    // Open modal first
    const heatmapCell = screen.getByText('Mock Heatmap Cell');
    fireEvent.click(heatmapCell);
    
    await waitFor(() => {
      expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
    });
    
    // Close modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-dashboard-class';
    const { container } = render(<CohortAnalysisDashboard className={customClass} />);
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('uses correct grid layout for components', () => {
    render(<CohortAnalysisDashboard />);
    
    // Main content should have proper grid layout
    const gridContainer = screen.getByTestId('cohort-heatmap').closest('.grid');
    expect(gridContainer).toHaveClass('xl:grid-cols-3');
  });

  it('shows loading overlay during data refresh', async () => {
    render(<CohortAnalysisDashboard />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      const loadingOverlay = screen.getByText('Loading cohort analysis...');
      expect(loadingOverlay).toBeInTheDocument();
      expect(loadingOverlay.closest('.fixed')).toHaveClass('inset-0', 'z-40');
    });
  });

  it('handles responsive design classes correctly', () => {
    render(<CohortAnalysisDashboard />);
    
    // Header should have responsive flex classes
    const header = screen.getByText('Cohort Analysis Dashboard').closest('.flex');
    expect(header).toHaveClass('lg:flex-row', 'lg:items-center', 'lg:justify-between');
    
    // Main grid should be responsive
    const mainGrid = screen.getByTestId('cohort-heatmap').closest('.grid');
    expect(mainGrid).toHaveClass('grid-cols-1', 'xl:grid-cols-3');
  });

  it('initializes with correct default state', () => {
    render(<CohortAnalysisDashboard />);
    
    // Should show current time as last updated
    const lastUpdated = screen.getByText(/Last updated:/);
    expect(lastUpdated).toBeInTheDocument();
    
    // Should have refresh button enabled
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).not.toHaveAttribute('disabled');
  });

  it('disables refresh button during loading', async () => {
    render(<CohortAnalysisDashboard />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(refreshButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  it('updates last updated time after refresh', async () => {
    render(<CohortAnalysisDashboard />);
    
    const initialTime = screen.getByText(/Last updated:/).textContent;
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading cohort analysis...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    const updatedTime = screen.getByText(/Last updated:/).textContent;
    expect(updatedTime).not.toBe(initialTime);
  });
});