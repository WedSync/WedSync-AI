import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuditLogFilters } from '@/components/admin/AuditLogFilters';
import type { AuditSearchFilters } from '@/types/audit';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});
// Mock date functions for consistent testing
const mockDate = new Date('2024-01-15T10:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
Date.now = jest.fn(() => mockDate.getTime());
describe('AuditLogFilters', () => {
  const mockOnFiltersChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });
  it('renders filters component with all sections', () => {
    render(<AuditLogFilters onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('User & Action')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Quick Filters')).toBeInTheDocument();
  it('expands and collapses sections', async () => {
    const dateRangeButton = screen.getByRole('button', { name: /date range/i });
    // Should start collapsed
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(dateRangeButton);
    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
    // Click to collapse
      expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  it('applies date presets correctly', async () => {
    // Expand date range section
    fireEvent.click(screen.getByRole('button', { name: /date range/i }));
      const todayButton = screen.getByRole('button', { name: 'Today' });
      fireEvent.click(todayButton);
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: expect.any(String),
        end_date: expect.any(String)
      })
    );
  it('applies last 7 days preset correctly', async () => {
      const last7DaysButton = screen.getByRole('button', { name: 'Last 7 Days' });
      fireEvent.click(last7DaysButton);
  it('handles custom date range input', async () => {
    const user = userEvent.setup();
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      expect(startDateInput).toBeInTheDocument();
      expect(endDateInput).toBeInTheDocument();
  it('applies user filter correctly', async () => {
    fireEvent.click(screen.getByRole('button', { name: /user & action/i }));
      const userInput = screen.getByPlaceholderText('Search by user ID or email...');
      fireEvent.change(userInput, { target: { value: 'test@example.com' } });
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test@example.com'
        })
      );
    }, { timeout: 1500 }); // Account for debounce
  it('applies action filter correctly', async () => {
      const actionSelect = screen.getByRole('combobox', { name: /action/i });
      fireEvent.change(actionSelect, { target: { value: 'LOGIN' } });
        action: 'LOGIN'
  it('applies resource type filter correctly', async () => {
      const resourceSelect = screen.getByRole('combobox', { name: /resource type/i });
      fireEvent.change(resourceSelect, { target: { value: 'WEDDING' } });
        resource_type: 'WEDDING'
  it('applies risk level filter correctly', async () => {
    fireEvent.click(screen.getByRole('button', { name: /security/i }));
      const riskSelect = screen.getByRole('combobox', { name: /risk level/i });
      fireEvent.change(riskSelect, { target: { value: 'HIGH' } });
        risk_level: 'HIGH'
  it('applies IP address filter correctly', async () => {
      const ipInput = screen.getByPlaceholderText('e.g., 192.168.1.1');
      fireEvent.change(ipInput, { target: { value: '192.168.1.100' } });
          ip_address: '192.168.1.100'
    }, { timeout: 1500 });
  it('applies quick filters correctly', async () => {
    const failedLoginsButton = screen.getByRole('button', { name: /failed logins/i });
    fireEvent.click(failedLoginsButton);
        action: 'LOGIN',
        description: expect.stringContaining('failed')
  it('applies high risk activities filter correctly', async () => {
    const highRiskButton = screen.getByRole('button', { name: /high risk activities/i });
    fireEvent.click(highRiskButton);
  it('clears all filters when clear button is clicked', async () => {
    // Apply some filters first
    fireEvent.click(screen.getByRole('button', { name: /high risk activities/i }));
    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  it('saves and loads filter presets', async () => {
    // Apply some filters
    // Save preset
    const saveButton = screen.getByRole('button', { name: /save current filters/i });
    fireEvent.click(saveButton);
    // Should call localStorage.setItem
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  it('loads saved presets on component mount', () => {
    const savedFilters = JSON.stringify({
      risk_level: 'HIGH',
      action: 'LOGIN'
    mockLocalStorage.getItem.mockReturnValue(savedFilters);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('audit-filter-presets');
  it('debounces search input correctly', async () => {
    jest.useFakeTimers();
      // Type multiple characters quickly
      fireEvent.change(userInput, { target: { value: 't' } });
      fireEvent.change(userInput, { target: { value: 'te' } });
      fireEvent.change(userInput, { target: { value: 'test' } });
    // Should not call onChange immediately
    expect(mockOnFiltersChange).not.toHaveBeenCalled();
    // Fast-forward time
    jest.advanceTimersByTime(1000);
        user_id: 'test'
    jest.useRealTimers();
  it('validates date range inputs', async () => {
      // Set end date before start date
      fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-10' } });
    // Should show validation error or prevent invalid range
    // This behavior depends on implementation
  it('handles initial filters prop correctly', () => {
    const initialFilters: Partial<AuditSearchFilters> = {
      action: 'DELETE'
    };
    render(<AuditLogFilters initialFilters={initialFilters} onFiltersChange={mockOnFiltersChange} />);
    // Should apply initial filters
    expect(mockOnFiltersChange).toHaveBeenCalledWith(initialFilters);
  it('applies wedding-specific filters correctly', async () => {
    const weddingDataButton = screen.getByRole('button', { name: /wedding data changes/i });
    fireEvent.click(weddingDataButton);
  it('applies guest management filter correctly', async () => {
    const guestMgmtButton = screen.getByRole('button', { name: /guest management/i });
    fireEvent.click(guestMgmtButton);
        resource_type: 'GUEST'
  it('shows active filter count', async () => {
    // Apply multiple filters
    fireEvent.click(screen.getByRole('button', { name: /failed logins/i }));
    // Should show filter count indicator
    expect(screen.getByText(/2 filters active/i)).toBeInTheDocument();
  it('handles section toggle states correctly', async () => {
    const sections = ['date range', 'user & action', 'security'];
    for (const section of sections) {
      const button = screen.getByRole('button', { name: new RegExp(section, 'i') });
      // Should start collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false');
      // Click to expand
      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    }
  it('applies correct accessibility attributes', () => {
    const sections = screen.getAllByRole('button', { name: /range|action|security/i });
    sections.forEach(section => {
      expect(section).toHaveAttribute('aria-expanded');
  it('handles keyboard navigation correctly', async () => {
    const firstButton = screen.getByRole('button', { name: /date range/i });
    await user.tab();
    expect(firstButton).toHaveFocus();
    // Press Enter to expand
    await user.keyboard('{Enter}');
      expect(firstButton).toHaveAttribute('aria-expanded', 'true');
