import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals';
import { useBudgetExport } from '../useBudgetExport';
import type { ExportOptions, ExportFilters } from '@/types/budget-export';

// Mock createClientComponentClient
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn()
  }
};
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient
}));
// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
// Mock fetch globally
global.fetch = jest.fn();
const mockSession = {
  user: { id: 'user-123' },
  access_token: 'mock-token'
const mockExportOptions: ExportOptions = {
  format: 'pdf',
  filters: {
    categories: ['Venue'],
    dateRange: null,
    paymentStatus: 'all',
    includeNotes: true,
    includeReceipts: false,
    includeVendors: true
  },
  includeCharts: true,
  includeSummary: true,
  customTitle: 'Wedding Budget Report'
describe('useBudgetExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, exportId: 'export-123' })
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  it('initializes with default state', () => {
    const { result } = renderHook(() => useBudgetExport());
    expect(result.current.currentExport).toBeNull();
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportHistory).toEqual([]);
    expect(result.current.historyLoading).toBe(false);
  it('starts export successfully', async () => {
    let exportId: string;
    await act(async () => {
      exportId = await result.current.startExport(mockExportOptions);
    expect(exportId!).toBe('export-123');
    expect(global.fetch).toHaveBeenCalledWith('/api/budget/export', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify({
        clientId: 'user-123',
        format: 'pdf',
        filters: mockExportOptions.filters,
        options: {
          includeCharts: true,
          includeSummary: true,
          customTitle: 'Wedding Budget Report'
        }
      })
    }));
  it('handles export start failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Export failed' })
    const onExportError = jest.fn();
    const { result } = renderHook(() => useBudgetExport({ onExportError }));
      try {
        await result.current.startExport(mockExportOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    expect(onExportError).toHaveBeenCalledWith('Export failed');
  it('handles authentication error during export', async () => {
      data: { session: null },
        expect((error as Error).message).toBe('User not authenticated');
  it('polls for export progress', async () => {
    // Mock status endpoint responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // Initial export start
        ok: true,
        json: () => Promise.resolve({ success: true, exportId: 'export-123' })
      .mockResolvedValueOnce({ // First progress check
        json: () => Promise.resolve({
          exportId: 'export-123',
          status: 'generating',
          progress: 50,
          message: 'Generating PDF...'
        })
      .mockResolvedValueOnce({ // Second progress check
          status: 'completed',
          progress: 100,
          downloadUrl: 'https://example.com/download'
      });
    const onExportComplete = jest.fn();
    const { result } = renderHook(() => useBudgetExport({ onExportComplete }));
      await result.current.startExport(mockExportOptions);
    // Fast-forward to trigger polling
    act(() => {
      jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(result.current.currentExport?.status).toBe('generating');
      expect(result.current.currentExport?.progress).toBe(50);
    // Advance time again for completion
      expect(onExportComplete).toHaveBeenCalledWith('export-123', 'https://example.com/download');
  it('cancels export successfully', async () => {
      .mockResolvedValueOnce({ // Initial export
      .mockResolvedValueOnce({ // Cancel endpoint
        json: () => Promise.resolve({ success: true })
      await result.current.cancelExport('export-123');
    expect(global.fetch).toHaveBeenCalledWith('/api/budget/export/export-123/cancel', expect.objectContaining({
    expect(result.current.currentExport?.status).toBe('cancelled');
  it('downloads export successfully', async () => {
    const mockBlob = new Blob(['mock pdf content'], { type: 'application/pdf' });
      blob: () => Promise.resolve(mockBlob)
    // Mock DOM elements
    const mockLink = {
      click: jest.fn(),
      setAttribute: jest.fn()
    };
    Object.defineProperty(document, 'createElement', {
      value: jest.fn(() => mockLink),
      writable: true
    Object.defineProperty(document.body, 'appendChild', {
      value: jest.fn(),
    Object.defineProperty(document.body, 'removeChild', {
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: jest.fn(() => 'blob:url'),
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      await result.current.downloadExport('export-123');
    expect(global.fetch).toHaveBeenCalledWith('/api/budget/export/export-123/download', expect.objectContaining({
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Download started',
      description: 'Your budget export is being downloaded.'
  it('refreshes export history', async () => {
    const mockHistory = [
      { id: '1', fileName: 'export-1.pdf', status: 'completed' },
      { id: '2', fileName: 'export-2.csv', status: 'completed' }
    ];
      json: () => Promise.resolve({ success: true, records: mockHistory })
      await result.current.refreshHistory();
    expect(result.current.exportHistory).toEqual(mockHistory);
    expect(global.fetch).toHaveBeenCalledWith('/api/budget/export/history', expect.objectContaining({
  it('deletes history record', async () => {
      json: () => Promise.resolve({ success: true })
    // Set initial history
      result.current.exportHistory = [
        { id: '1', fileName: 'export-1.pdf' } as any,
        { id: '2', fileName: 'export-2.pdf' } as any
      ];
      await result.current.deleteHistoryRecord('1');
    expect(global.fetch).toHaveBeenCalledWith('/api/budget/export/1', expect.objectContaining({
      method: 'DELETE',
  it('validates filters correctly', () => {
    // Test valid filters
    const validFilters: ExportFilters = {
      categories: ['Venue'],
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      paymentStatus: 'all',
      includeNotes: true,
      includeReceipts: false,
      includeVendors: true
    const validationErrors = result.current.validateFilters(validFilters);
    expect(validationErrors).toHaveLength(0);
    // Test invalid date range
    const invalidFilters: ExportFilters = {
      ...validFilters,
        start: new Date('2024-12-31'),
        end: new Date('2024-01-01') // End before start
    const invalidErrors = result.current.validateFilters(invalidFilters);
    expect(invalidErrors).toContain('Start date must be before end date');
  it('validates too many categories', () => {
    const filtersWithTooManyCategories: ExportFilters = {
      categories: Array.from({ length: 51 }, (_, i) => `Category ${i}`),
      dateRange: null,
    const errors = result.current.validateFilters(filtersWithTooManyCategories);
    expect(errors).toContain('Cannot select more than 50 categories');
  it('validates future dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const filtersWithFutureDates: ExportFilters = {
      categories: [],
        start: new Date(),
        end: futureDate
    const errors = result.current.validateFilters(filtersWithFutureDates);
    expect(errors).toContain('Date range cannot be in the future');
  it('cleans up polling interval on unmount', () => {
    const { unmount } = renderHook(() => useBudgetExport());
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    unmount();
    // Should clean up any running intervals
    expect(clearIntervalSpy).toHaveBeenCalled();
  it('aborts fetch on unmount', async () => {
    const { result, unmount } = renderHook(() => useBudgetExport());
    // Start an export
    const exportPromise = act(async () => {
      return result.current.startExport(mockExportOptions);
    // Unmount before completion
    // The export should be aborted
    await expect(exportPromise).rejects.toThrow();
  it('uses custom client ID when provided', async () => {
    const customClientId = 'custom-client-123';
    const { result } = renderHook(() => useBudgetExport({ clientId: customClientId }));
      body: JSON.stringify(expect.objectContaining({
        clientId: customClientId
      }))
  it('uses custom poll interval', async () => {
    const customPollInterval = 5000; // 5 seconds
    const { result } = renderHook(() => useBudgetExport({ pollInterval: customPollInterval }));
      .mockResolvedValueOnce({
      .mockResolvedValue({
          progress: 50
    // Advance by custom interval
      jest.advanceTimersByTime(customPollInterval);
    // Should have made progress check
      expect(global.fetch).toHaveBeenCalledWith('/api/budget/export/export-123', expect.any(Object));
});
