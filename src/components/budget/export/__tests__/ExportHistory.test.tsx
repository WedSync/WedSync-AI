import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import { ExportHistory } from '../ExportHistory';
import type { ExportHistoryProps, ExportHistoryRecord } from '@/types/budget-export';

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'MMM d, yyyy') return 'Jan 15, 2024';
    if (formatStr === 'MMM d') return 'Jan 1';
    return date.toISOString().split('T')[0];
  },
  formatDistanceToNow: () => '2 hours ago'
}));
const mockHistoryRecord: ExportHistoryRecord = {
  id: '1',
  userId: 'user-123',
  clientId: 'client-456',
  format: 'pdf',
  filters: {
    categories: ['Venue', 'Catering'],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    },
    paymentStatus: 'all',
    includeNotes: true,
    includeReceipts: false,
    includeVendors: true
  fileName: 'wedding-budget-report-2024-01-15.pdf',
  fileSize: 2457600, // 2.4 MB
  downloadUrl: 'https://example.com/exports/1',
  downloadCount: 3,
  status: 'completed',
  createdAt: new Date('2024-01-15T10:30:00'),
  expiresAt: new Date('2024-02-15T10:30:00'),
  metadata: {
    categoriesCount: 2,
    transactionsCount: 45,
    totalAmount: 25000,
    }
  }
};
const defaultProps: ExportHistoryProps = {
  onDownload: jest.fn(),
  onDelete: jest.fn(),
  maxRecords: 20
describe('ExportHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the useEffect API call behavior
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ records: [mockHistoryRecord] }),
      })
    ) as jest.Mock;
  });
  it('renders loading state initially', () => {
    render(<ExportHistory {...defaultProps} />);
    expect(screen.getByText('Loading export history...')).toBeInTheDocument();
  it('displays export history after loading', async () => {
    await waitFor(() => {
      expect(screen.getByText('Export History')).toBeInTheDocument();
      expect(screen.getByText('1 export')).toBeInTheDocument();
      expect(screen.getByText('wedding-budget-report-2024-01-15.pdf')).toBeInTheDocument();
    });
  it('shows export details correctly', async () => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('2.4 MB')).toBeInTheDocument();
      expect(screen.getByText('3 downloads')).toBeInTheDocument();
      expect(screen.getByText('2 categories • 45 transactions')).toBeInTheDocument();
  it('displays correct status badges', async () => {
      const completedBadge = screen.getByText('Completed');
      expect(completedBadge).toBeInTheDocument();
      expect(completedBadge.closest('.bg-green-100')).toBeInTheDocument();
  it('shows failed status with error message', async () => {
    const failedRecord = {
      ...mockHistoryRecord,
      id: '2',
      status: 'failed' as const,
      error: 'Generation failed due to missing data'
    };
        json: () => Promise.resolve({ records: [failedRecord] }),
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Generation failed due to missing data')).toBeInTheDocument();
  it('shows expiration warning for expired exports', async () => {
    const expiredRecord = {
      id: '3',
      expiresAt: new Date('2020-01-01') // Past date
        json: () => Promise.resolve({ records: [expiredRecord] }),
      expect(screen.getByText('This export has expired and is no longer available for download')).toBeInTheDocument();
  it('calls onDownload when download button is clicked', async () => {
    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(menuButton);
    // Click download option
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    expect(defaultProps.onDownload).toHaveBeenCalledWith(mockHistoryRecord);
  it('calls onDelete when delete button is clicked', async () => {
    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true);
    // Click delete option
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  it('does not delete when user cancels confirmation', async () => {
    // Mock window.confirm to return false
    window.confirm = jest.fn(() => false);
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  it('hides download button for expired exports', async () => {
      const menuButton = screen.getByRole('button', { name: 'Open menu' });
      fireEvent.click(menuButton);
      
      expect(screen.queryByText('Download')).not.toBeInTheDocument();
  it('shows empty state when no exports exist', async () => {
        json: () => Promise.resolve({ records: [] }),
      expect(screen.getByText('No exports yet')).toBeInTheDocument();
      expect(screen.getByText('Your export history will appear here once you create your first budget report.')).toBeInTheDocument();
  it('shows error state when API call fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error'))) as jest.Mock;
      expect(screen.getByText('Failed to load export history')).toBeInTheDocument();
  it('formats file sizes correctly', async () => {
    const records = [
      { ...mockHistoryRecord, id: '1', fileSize: 1024 }, // 1 KB
      { ...mockHistoryRecord, id: '2', fileSize: 1048576 }, // 1 MB
      { ...mockHistoryRecord, id: '3', fileSize: 1073741824 } // 1 GB
    ];
        json: () => Promise.resolve({ records }),
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('1.0 GB')).toBeInTheDocument();
  it('shows correct format icons', async () => {
      { ...mockHistoryRecord, id: '1', format: 'pdf' as const },
      { ...mockHistoryRecord, id: '2', format: 'csv' as const },
      { ...mockHistoryRecord, id: '3', format: 'excel' as const }
      // Icons should be present (actual icon testing would require more specific selectors)
      expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(records.length);
  it('respects maxRecords limit', async () => {
    const manyRecords = Array.from({ length: 30 }, (_, i) => ({
      id: `record-${i}`
    }));
        json: () => Promise.resolve({ records: manyRecords }),
    render(<ExportHistory {...defaultProps} maxRecords={10} />);
      expect(screen.getByText('10 exports')).toBeInTheDocument();
      expect(screen.getByText('Load more exports')).toBeInTheDocument();
  it('shows date range in metadata when available', async () => {
      expect(screen.getByText('Jan 1 - Jan 1, 2024')).toBeInTheDocument();
  it('handles records without download count gracefully', async () => {
    const recordWithoutDownloads = {
      downloadCount: 0
        json: () => Promise.resolve({ records: [recordWithoutDownloads] }),
      expect(screen.queryByText('downloads')).not.toBeInTheDocument();
  it('updates local state when record is deleted', async () => {
    // Open dropdown and delete
    fireEvent.click(screen.getByText('Delete'));
});
