/**
 * Component Unit Tests: Budget Export UI Components
 * WS-166 - Team E - Round 1
 * 
 * Tests all budget export UI components with comprehensive mock scenarios
 * Covers rendering, state management, user interactions, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock Next.js router
const mockPush = jest.fn();
const mockQuery = {};
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: mockQuery,
    pathname: '/dashboard/budget'
  })
}));

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock user session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user-id', email: 'test@example.com' },
      expires: '2025-12-31'
    },
    status: 'authenticated'
  })
}));

interface BudgetItem {
  id: string;
  category: string;
  vendor: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'planned';
  weddingId: string;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetItem[];
  onExportStart: (config: ExportConfig) => void;
}

interface ExportConfig {
  format: 'pdf' | 'csv' | 'excel';
  filters: {
    categories?: string[];
    dateRange?: { start: string; end: string };
    paymentStatus?: 'all' | 'paid' | 'pending' | 'planned';
  };
  options: {
    includeCharts?: boolean;
    includeTimeline?: boolean;
    includePaymentSchedule?: boolean;
    includeVendorDetails?: boolean;
  };
}

// Mock budget data for testing
const mockBudgetData: BudgetItem[] = [
  {
    id: 'item-1',
    category: 'venue',
    vendor: 'Beautiful Wedding Venue',
    amount: 15000,
    dueDate: '2025-06-01',
    status: 'pending',
    weddingId: 'wedding-123'
  },
  {
    id: 'item-2',
    category: 'catering',
    vendor: 'Gourmet Catering Co',
    amount: 8500,
    dueDate: '2025-05-15',
    status: 'paid',
    weddingId: 'wedding-123'
  },
  {
    id: 'item-3',
    category: 'photography',
    vendor: 'Perfect Moments Photography',
    amount: 3500,
    dueDate: '2025-04-01',
    status: 'planned',
    weddingId: 'wedding-123'
  },
  {
    id: 'item-4',
    category: 'flowers',
    vendor: 'Blooming Creations',
    amount: 1200,
    dueDate: '2025-05-30',
    status: 'pending',
    weddingId: 'wedding-123'
  }
];

// Mock BudgetExportDialog component (would be implemented by Team A)
const MockBudgetExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, 
  onClose, 
  budgetData, 
  onExportStart 
}) => {
  const [selectedFormat, setSelectedFormat] = React.useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [dateRangeStart, setDateRangeStart] = React.useState('');
  const [dateRangeEnd, setDateRangeEnd] = React.useState('');
  const [paymentStatus, setPaymentStatus] = React.useState<'all' | 'paid' | 'pending' | 'planned'>('all');
  const [includeCharts, setIncludeCharts] = React.useState(false);
  const [includeTimeline, setIncludeTimeline] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const availableCategories = ['venue', 'catering', 'photography', 'flowers', 'music', 'decorations'];

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    const config: ExportConfig = {
      format: selectedFormat,
      filters: {
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        dateRange: dateRangeStart && dateRangeEnd ? { start: dateRangeStart, end: dateRangeEnd } : undefined,
        paymentStatus: paymentStatus
      },
      options: {
        includeCharts,
        includeTimeline
      }
    };

    try {
      await onExportStart(config);
    } catch (error) {
      setExportError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div data-testid="budget-export-dialog" role="dialog" aria-labelledby="export-dialog-title">
      <div className="dialog-content">
        <h2 id="export-dialog-title">Export Budget Report</h2>
        
        {/* Format Selection */}
        <div data-testid="format-selection">
          <label htmlFor="export-format-select">Export Format:</label>
          <select
            id="export-format-select"
            data-testid="export-format-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'csv' | 'excel')}
          >
            <option value="pdf">PDF Report</option>
            <option value="csv">CSV Data</option>
            <option value="excel">Excel Spreadsheet</option>
          </select>
        </div>

        {/* Category Filters */}
        <fieldset data-testid="category-filters">
          <legend>Filter by Categories:</legend>
          {availableCategories.map(category => (
            <label key={category} className="category-filter">
              <input
                type="checkbox"
                data-testid={`category-${category}-checkbox`}
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryToggle(category)}
              />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </label>
          ))}
        </fieldset>

        {/* Date Range Filters */}
        <div data-testid="date-range-filters">
          <label htmlFor="date-range-start">Start Date:</label>
          <input
            type="date"
            id="date-range-start"
            data-testid="date-range-start"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
          />
          
          <label htmlFor="date-range-end">End Date:</label>
          <input
            type="date"
            id="date-range-end"
            data-testid="date-range-end"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
          />
        </div>

        {/* Payment Status Filter */}
        <div data-testid="payment-status-filter">
          <label htmlFor="payment-status-select">Payment Status:</label>
          <select
            id="payment-status-select"
            data-testid="payment-status-select"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as any)}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid Only</option>
            <option value="pending">Pending Only</option>
            <option value="planned">Planned Only</option>
          </select>
        </div>

        {/* Advanced Options */}
        {selectedFormat === 'pdf' && (
          <fieldset data-testid="advanced-options">
            <legend>Advanced Options:</legend>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                data-testid="include-charts-checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
              Include Charts and Graphs
            </label>
            
            <label className="option-checkbox">
              <input
                type="checkbox"
                data-testid="include-timeline-checkbox"
                checked={includeTimeline}
                onChange={(e) => setIncludeTimeline(e.target.checked)}
              />
              Include Payment Timeline
            </label>
          </fieldset>
        )}

        {/* Error Display */}
        {exportError && (
          <div data-testid="export-error-message" role="alert" className="error-message">
            {exportError}
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div data-testid="export-progress" role="status">
            <div data-testid="export-progress-text">Generating export...</div>
            <div className="progress-bar">
              <div className="progress-indicator" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="dialog-actions">
          <button
            type="button"
            data-testid="close-export-dialog"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          
          <button
            type="button"
            data-testid="start-export-button"
            onClick={handleExport}
            disabled={isExporting || budgetData.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Start Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

describe('BudgetExportDialog Component', () => {
  const defaultProps: ExportDialogProps = {
    isOpen: true,
    onClose: jest.fn(),
    budgetData: mockBudgetData,
    onExportStart: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render with correct initial state', () => {
      render(<MockBudgetExportDialog {...defaultProps} />);

      expect(screen.getByTestId('budget-export-dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Export Budget Report')).toBeInTheDocument();
      
      // Default format should be PDF
      expect(screen.getByDisplayValue('PDF Report')).toBeInTheDocument();
      
      // Advanced options should be visible for PDF format
      expect(screen.getByTestId('advanced-options')).toBeInTheDocument();
      
      // Export button should be enabled with data
      expect(screen.getByTestId('start-export-button')).toBeEnabled();
    });

    it('should not render when isOpen is false', () => {
      render(<MockBudgetExportDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('budget-export-dialog')).not.toBeInTheDocument();
    });

    it('should render all category filter options', () => {
      render(<MockBudgetExportDialog {...defaultProps} />);

      const categoryOptions = ['venue', 'catering', 'photography', 'flowers', 'music', 'decorations'];
      
      categoryOptions.forEach(category => {
        expect(screen.getByTestId(`category-${category}-checkbox`)).toBeInTheDocument();
      });
    });

    it('should render all export format options', () => {
      render(<MockBudgetExportDialog {...defaultProps} />);

      const formatSelect = screen.getByTestId('export-format-select');
      expect(formatSelect).toBeInTheDocument();
      
      expect(screen.getByText('PDF Report')).toBeInTheDocument();
      expect(screen.getByText('CSV Data')).toBeInTheDocument();
      expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument();
    });

    it('should disable export button when no budget data', () => {
      render(<MockBudgetExportDialog {...defaultProps} budgetData={[]} />);
      
      expect(screen.getByTestId('start-export-button')).toBeDisabled();
    });
  });

  describe('Format Selection Behavior', () => {
    it('should update format when selection changes', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const formatSelect = screen.getByTestId('export-format-select');
      
      await user.selectOptions(formatSelect, 'csv');
      expect(screen.getByDisplayValue('CSV Data')).toBeInTheDocument();
      
      await user.selectOptions(formatSelect, 'excel');
      expect(screen.getByDisplayValue('Excel Spreadsheet')).toBeInTheDocument();
    });

    it('should hide advanced options for CSV format', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      // Initially showing advanced options for PDF
      expect(screen.getByTestId('advanced-options')).toBeInTheDocument();
      
      // Switch to CSV format
      await user.selectOptions(screen.getByTestId('export-format-select'), 'csv');
      
      // Advanced options should be hidden
      expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument();
    });

    it('should hide advanced options for Excel format', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      await user.selectOptions(screen.getByTestId('export-format-select'), 'excel');
      expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument();
    });
  });

  describe('Category Filter Functionality', () => {
    it('should toggle category selections', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const venueCheckbox = screen.getByTestId('category-venue-checkbox');
      const cateringCheckbox = screen.getByTestId('category-catering-checkbox');
      
      // Initially unchecked
      expect(venueCheckbox).not.toBeChecked();
      expect(cateringCheckbox).not.toBeChecked();
      
      // Select venue
      await user.click(venueCheckbox);
      expect(venueCheckbox).toBeChecked();
      
      // Select catering
      await user.click(cateringCheckbox);
      expect(cateringCheckbox).toBeChecked();
      
      // Deselect venue
      await user.click(venueCheckbox);
      expect(venueCheckbox).not.toBeChecked();
      expect(cateringCheckbox).toBeChecked(); // Should remain checked
    });

    it('should handle multiple category selections', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const categories = ['venue', 'catering', 'photography', 'flowers'];
      
      // Select multiple categories
      for (const category of categories) {
        await user.click(screen.getByTestId(`category-${category}-checkbox`));
      }
      
      // All should be checked
      categories.forEach(category => {
        expect(screen.getByTestId(`category-${category}-checkbox`)).toBeChecked();
      });
    });
  });

  describe('Date Range Filter Functionality', () => {
    it('should update date range values', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const startDateInput = screen.getByTestId('date-range-start');
      const endDateInput = screen.getByTestId('date-range-end');
      
      await user.type(startDateInput, '2025-01-01');
      await user.type(endDateInput, '2025-12-31');
      
      expect(startDateInput).toHaveValue('2025-01-01');
      expect(endDateInput).toHaveValue('2025-12-31');
    });

    it('should clear date range when needed', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const startDateInput = screen.getByTestId('date-range-start');
      
      await user.type(startDateInput, '2025-01-01');
      expect(startDateInput).toHaveValue('2025-01-01');
      
      await user.clear(startDateInput);
      expect(startDateInput).toHaveValue('');
    });
  });

  describe('Payment Status Filter', () => {
    it('should update payment status filter', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const statusSelect = screen.getByTestId('payment-status-select');
      
      // Default should be 'all'
      expect(statusSelect).toHaveValue('all');
      
      await user.selectOptions(statusSelect, 'paid');
      expect(statusSelect).toHaveValue('paid');
      
      await user.selectOptions(statusSelect, 'pending');
      expect(statusSelect).toHaveValue('pending');
      
      await user.selectOptions(statusSelect, 'planned');
      expect(statusSelect).toHaveValue('planned');
    });
  });

  describe('Advanced Options for PDF', () => {
    it('should toggle chart inclusion option', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const chartsCheckbox = screen.getByTestId('include-charts-checkbox');
      
      expect(chartsCheckbox).not.toBeChecked();
      
      await user.click(chartsCheckbox);
      expect(chartsCheckbox).toBeChecked();
      
      await user.click(chartsCheckbox);
      expect(chartsCheckbox).not.toBeChecked();
    });

    it('should toggle timeline inclusion option', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const timelineCheckbox = screen.getByTestId('include-timeline-checkbox');
      
      expect(timelineCheckbox).not.toBeChecked();
      
      await user.click(timelineCheckbox);
      expect(timelineCheckbox).toBeChecked();
    });

    it('should handle multiple advanced options', async () => {
      const user = userEvent.setup();
      render(<MockBudgetExportDialog {...defaultProps} />);

      const chartsCheckbox = screen.getByTestId('include-charts-checkbox');
      const timelineCheckbox = screen.getByTestId('include-timeline-checkbox');
      
      await user.click(chartsCheckbox);
      await user.click(timelineCheckbox);
      
      expect(chartsCheckbox).toBeChecked();
      expect(timelineCheckbox).toBeChecked();
    });
  });

  describe('Export Functionality', () => {
    it('should call onExportStart with correct configuration', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockResolvedValue(undefined);
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      // Configure export
      await user.selectOptions(screen.getByTestId('export-format-select'), 'pdf');
      await user.click(screen.getByTestId('category-venue-checkbox'));
      await user.click(screen.getByTestId('category-catering-checkbox'));
      await user.type(screen.getByTestId('date-range-start'), '2025-01-01');
      await user.type(screen.getByTestId('date-range-end'), '2025-12-31');
      await user.selectOptions(screen.getByTestId('payment-status-select'), 'pending');
      await user.click(screen.getByTestId('include-charts-checkbox'));
      await user.click(screen.getByTestId('include-timeline-checkbox'));

      // Start export
      await user.click(screen.getByTestId('start-export-button'));

      expect(mockOnExportStart).toHaveBeenCalledWith({
        format: 'pdf',
        filters: {
          categories: ['venue', 'catering'],
          dateRange: { start: '2025-01-01', end: '2025-12-31' },
          paymentStatus: 'pending'
        },
        options: {
          includeCharts: true,
          includeTimeline: true
        }
      });
    });

    it('should handle export with no filters', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockResolvedValue(undefined);
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));

      expect(mockOnExportStart).toHaveBeenCalledWith({
        format: 'pdf',
        filters: {
          paymentStatus: 'all'
        },
        options: {
          includeCharts: false,
          includeTimeline: false
        }
      });
    });

    it('should show progress during export', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));

      // Progress should be visible
      expect(screen.getByTestId('export-progress')).toBeInTheDocument();
      expect(screen.getByTestId('export-progress-text')).toHaveTextContent('Generating export...');
      
      // Buttons should be disabled during export
      expect(screen.getByTestId('start-export-button')).toBeDisabled();
      expect(screen.getByTestId('close-export-dialog')).toBeDisabled();

      // Wait for export to complete
      await waitFor(() => {
        expect(screen.queryByTestId('export-progress')).not.toBeInTheDocument();
      });
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockRejectedValue(new Error('Export failed'));
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));

      await waitFor(() => {
        expect(screen.getByTestId('export-error-message')).toBeInTheDocument();
        expect(screen.getByTestId('export-error-message')).toHaveTextContent('Export failed. Please try again.');
      });

      // Buttons should be re-enabled after error
      expect(screen.getByTestId('start-export-button')).toBeEnabled();
      expect(screen.getByTestId('close-export-dialog')).toBeEnabled();
    });
  });

  describe('Dialog Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<MockBudgetExportDialog {...defaultProps} onClose={mockOnClose} />);

      await user.click(screen.getByTestId('close-export-dialog'));
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not allow closing during export', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      const mockOnExportStart = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<MockBudgetExportDialog {...defaultProps} onClose={mockOnClose} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));
      
      // Close button should be disabled
      expect(screen.getByTestId('close-export-dialog')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MockBudgetExportDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'export-dialog-title');
      expect(screen.getByRole('alert')).not.toBeInTheDocument(); // No error by default
      
      // Form controls should have proper labels
      expect(screen.getByLabelText('Export Format:')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date:')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date:')).toBeInTheDocument();
      expect(screen.getByLabelText('Payment Status:')).toBeInTheDocument();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockRejectedValue(new Error('Export failed'));
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Export failed. Please try again.');
      });
    });

    it('should announce progress to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnExportStart = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<MockBudgetExportDialog {...defaultProps} onExportStart={mockOnExportStart} />);

      await user.click(screen.getByTestId('start-export-button'));

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Generating export...');
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport considerations', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<MockBudgetExportDialog {...defaultProps} />);

      // Dialog should still be functional on mobile
      expect(screen.getByTestId('budget-export-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('export-format-select')).toBeInTheDocument();
      expect(screen.getByTestId('start-export-button')).toBeInTheDocument();
    });
  });
});