import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import { ExportFormatSelector } from '../ExportFormatSelector';
import { FORMAT_PREVIEWS } from '@/types/budget-export';

const defaultProps = {
  selectedFormat: 'pdf' as const,
  onFormatChange: jest.fn(),
  isDisabled: false
};
describe('ExportFormatSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders all format options', () => {
    render(<ExportFormatSelector {...defaultProps} />);
    
    expect(screen.getByText('Select Export Format')).toBeInTheDocument();
    expect(screen.getByText('PDF Document')).toBeInTheDocument();
    expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Excel Workbook')).toBeInTheDocument();
  it('highlights selected format', () => {
    render(<ExportFormatSelector {...defaultProps} selectedFormat="csv" />);
    const csvCard = screen.getByText('CSV Spreadsheet').closest('[data-testid="format-card-csv"]');
    expect(csvCard).toHaveClass('ring-2', 'ring-primary-600');
  it('calls onFormatChange when format is selected', () => {
    fireEvent.click(screen.getByText('CSV Spreadsheet'));
    expect(defaultProps.onFormatChange).toHaveBeenCalledWith('csv');
  it('displays format descriptions', () => {
    expect(screen.getByText('Professional report with charts and formatting')).toBeInTheDocument();
    expect(screen.getByText('Raw data for analysis and import')).toBeInTheDocument();
    expect(screen.getByText('Formatted spreadsheet with multiple sheets')).toBeInTheDocument();
  it('shows file size estimates', () => {
    expect(screen.getByText('~2-5 MB')).toBeInTheDocument();
    expect(screen.getByText('~50-200 KB')).toBeInTheDocument();
    expect(screen.getByText('~1-3 MB')).toBeInTheDocument();
  it('displays format features', () => {
    // PDF features
    expect(screen.getByText('Charts & graphs')).toBeInTheDocument();
    expect(screen.getByText('Professional formatting')).toBeInTheDocument();
    // CSV features
    expect(screen.getByText('Raw data export')).toBeInTheDocument();
    expect(screen.getByText('Excel compatible')).toBeInTheDocument();
    // Excel features
    expect(screen.getByText('Multiple sheets')).toBeInTheDocument();
    expect(screen.getByText('Charts included')).toBeInTheDocument();
  it('expands format details when clicked', () => {
    // Click on PDF card to expand details
    fireEvent.click(screen.getByText('PDF Document'));
    // Should show expanded details
    expect(screen.getByText('✓ Professional appearance')).toBeInTheDocument();
    expect(screen.getByText('✗ Not editable')).toBeInTheDocument();
    expect(screen.getByText('Best for: Sharing with family, vendors, or financial advisors')).toBeInTheDocument();
  it('shows compatibility information in expanded view', () => {
    render(<ExportFormatSelector {...defaultProps} selectedFormat="excel" />);
    // Click on Excel to ensure it's expanded
    fireEvent.click(screen.getByText('Excel Workbook'));
    expect(screen.getByText('Microsoft Excel')).toBeInTheDocument();
    expect(screen.getByText('LibreOffice')).toBeInTheDocument();
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();
  it('disables all formats when isDisabled is true', () => {
    render(<ExportFormatSelector {...defaultProps} isDisabled={true} />);
    const pdfCard = screen.getByText('PDF Document').closest('button');
    const csvCard = screen.getByText('CSV Spreadsheet').closest('button');
    const excelCard = screen.getByText('Excel Workbook').closest('button');
    expect(pdfCard).toBeDisabled();
    expect(csvCard).toBeDisabled();
    expect(excelCard).toBeDisabled();
  it('displays correct icons for each format', () => {
    // Check that SVG icons are present (Lucide icons render as SVG)
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThanOrEqual(3);
  it('handles rapid clicks without errors', () => {
    const csvCard = screen.getByText('CSV Spreadsheet');
    const excelCard = screen.getByText('Excel Workbook');
    // Rapid clicks
    fireEvent.click(csvCard);
    fireEvent.click(excelCard);
    expect(defaultProps.onFormatChange).toHaveBeenCalledTimes(3);
    expect(defaultProps.onFormatChange).toHaveBeenLastCalledWith('csv');
  it('maintains selection state correctly', () => {
    const { rerender } = render(<ExportFormatSelector {...defaultProps} selectedFormat="pdf" />);
    let pdfCard = screen.getByText('PDF Document').closest('[data-testid="format-card-pdf"]');
    expect(pdfCard).toHaveClass('ring-2', 'ring-primary-600');
    rerender(<ExportFormatSelector {...defaultProps} selectedFormat="csv" />);
    pdfCard = screen.getByText('PDF Document').closest('[data-testid="format-card-pdf"]');
    expect(pdfCard).not.toHaveClass('ring-2', 'ring-primary-600');
  it('shows preview information correctly', () => {
    // Verify that preview information matches the FORMAT_PREVIEWS constant
    const pdfPreview = FORMAT_PREVIEWS.pdf;
    const csvPreview = FORMAT_PREVIEWS.csv;
    const excelPreview = FORMAT_PREVIEWS.excel;
    expect(screen.getByText(pdfPreview.title)).toBeInTheDocument();
    expect(screen.getByText(pdfPreview.description)).toBeInTheDocument();
    expect(screen.getByText(csvPreview.title)).toBeInTheDocument();
    expect(screen.getByText(csvPreview.description)).toBeInTheDocument();
    expect(screen.getByText(excelPreview.title)).toBeInTheDocument();
    expect(screen.getByText(excelPreview.description)).toBeInTheDocument();
  it('handles keyboard navigation', () => {
    // Focus and press Enter
    pdfCard?.focus();
    fireEvent.keyDown(pdfCard!, { key: 'Enter' });
    expect(defaultProps.onFormatChange).toHaveBeenCalledWith('pdf');
  it('renders with proper accessibility attributes', () => {
    const formatCards = screen.getAllByRole('button');
    formatCards.forEach(card => {
      expect(card).toHaveAttribute('type', 'button');
    });
});
