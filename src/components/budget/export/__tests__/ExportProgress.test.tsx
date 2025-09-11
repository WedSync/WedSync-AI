import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import { ExportProgress } from '../ExportProgress';
import type { ExportProgressProps } from '@/types/budget-export';

const defaultProps: ExportProgressProps = {
  exportId: 'export-123',
  status: 'preparing',
  progress: 0,
  message: 'Preparing export...',
  onComplete: jest.fn(),
  onCancel: jest.fn(),
  onRetry: jest.fn()
};
describe('ExportProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders preparing state correctly', () => {
    render(<ExportProgress {...defaultProps} />);
    
    expect(screen.getByText('Preparing Export')).toBeInTheDocument();
    expect(screen.getByText('Preparing export...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel Export' })).toBeInTheDocument();
  it('renders generating state with progress', () => {
    render(
      <ExportProgress 
        {...defaultProps} 
        status="generating" 
        progress={45}
        message="Generating PDF report..."
      />
    );
    expect(screen.getByText('Generating Report')).toBeInTheDocument();
    expect(screen.getByText('Generating PDF report...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    // Check that progress bar shows correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
  it('renders completed state', () => {
        status="completed" 
        progress={100}
        message="Export completed successfully!"
    expect(screen.getByText('Export Complete')).toBeInTheDocument();
    expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument();
  it('renders failed state with retry option', () => {
        status="failed" 
        message="Export failed due to network error"
    expect(screen.getByText('Export Failed')).toBeInTheDocument();
    expect(screen.getByText('Export failed due to network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  it('renders cancelled state', () => {
        status="cancelled" 
        message="Export was cancelled by user"
    expect(screen.getByText('Export Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Export was cancelled by user')).toBeInTheDocument();
  it('calls onCancel when cancel button is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Export' }));
    expect(defaultProps.onCancel).toHaveBeenCalledWith();
  it('calls onRetry when retry button is clicked', () => {
        message="Export failed"
    fireEvent.click(screen.getByRole('button', { name: 'Retry Export' }));
    expect(defaultProps.onRetry).toHaveBeenCalledWith();
  it('calls onComplete when download button is clicked', () => {
        message="Export completed"
    fireEvent.click(screen.getByRole('button', { name: 'Download Report' }));
    expect(defaultProps.onComplete).toHaveBeenCalledWith('https://example.com/download');
  it('shows animated progress bar during generation', () => {
        progress={30}
    expect(progressBar).toHaveClass('transition-all');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  it('shows step-by-step progress indicators', () => {
        progress={60}
    // Should show progress steps
    expect(screen.getByText('1. Gathering data')).toBeInTheDocument();
    expect(screen.getByText('2. Processing categories')).toBeInTheDocument();
    expect(screen.getByText('3. Generating charts')).toBeInTheDocument();
    expect(screen.getByText('4. Creating document')).toBeInTheDocument();
    // Steps should be marked as completed based on progress
    const step1 = screen.getByText('1. Gathering data').closest('div');
    const step2 = screen.getByText('2. Processing categories').closest('div');
    const step3 = screen.getByText('3. Generating charts').closest('div');
    expect(step1).toHaveClass('text-green-600'); // Completed
    expect(step2).toHaveClass('text-green-600'); // Completed
    expect(step3).toHaveClass('text-blue-600'); // In progress
  it('displays estimated time remaining', () => {
        progress={40}
        message="Generating report... (~30 seconds remaining)"
    expect(screen.getByText('Generating report... (~30 seconds remaining)')).toBeInTheDocument();
  it('handles missing progress prop gracefully', () => {
    const propsWithoutProgress = {
      ...defaultProps,
      progress: undefined
    };
    render(<ExportProgress {...propsWithoutProgress} />);
    // Should not crash and should show indeterminate progress
  it('shows success icon for completed state', () => {
    // Check for success icon (CheckCircle from Lucide)
    const successIcon = screen.getByTestId('success-icon');
    expect(successIcon).toBeInTheDocument();
    expect(successIcon).toHaveClass('text-green-600');
  it('shows error icon for failed state', () => {
    // Check for error icon (XCircle from Lucide)
    const errorIcon = screen.getByTestId('error-icon');
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon).toHaveClass('text-red-600');
  it('shows spinning loader for generating state', () => {
    // Check for loading icon (Loader2 from Lucide)
    const loadingIcon = screen.getByTestId('loading-icon');
    expect(loadingIcon).toBeInTheDocument();
    expect(loadingIcon).toHaveClass('animate-spin');
  it('handles rapid status changes', () => {
    const { rerender } = render(<ExportProgress {...defaultProps} status="preparing" />);
    rerender(<ExportProgress {...defaultProps} status="generating" progress={50} />);
    rerender(<ExportProgress {...defaultProps} status="completed" />);
  it('disables buttons appropriately based on state', () => {
        progress={50}
    const cancelButton = screen.getByRole('button', { name: 'Cancel Export' });
    expect(cancelButton).not.toBeDisabled();
  it('handles long export IDs without layout issues', () => {
    const longExportId = 'very-long-export-id-that-might-break-layout-if-not-handled-properly-123456789';
    render(<ExportProgress {...defaultProps} exportId={longExportId} />);
    // Should render without layout issues
  it('shows appropriate ARIA labels for accessibility', () => {
        progress={75}
    expect(progressBar).toHaveAttribute('aria-label', 'Export progress');
    expect(cancelButton).toHaveAttribute('aria-label', 'Cancel the current export');
  it('handles zero progress correctly', () => {
        progress={0}
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  it('handles 100% progress correctly', () => {
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
});
