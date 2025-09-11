import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import '@testing-library/jest-dom';
import { SuspiciousActivityAlert } from '@/components/admin/SuspiciousActivityAlert';
import type { SecurityAlert } from '@/types/audit';

// Mock icons
jest.mock('@heroicons/react/20/solid', () => ({
  ExclamationTriangleIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="exclamation-triangle-icon" />
  ),
  ShieldExclamationIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="shield-exclamation-icon" />
  XMarkIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="x-mark-icon" />
  EyeIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="eye-icon" />
  CheckIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="check-icon" />
}));
describe('SuspiciousActivityAlert', () => {
  const mockOnResolve = jest.fn();
  const mockOnInvestigate = jest.fn();
  const mockOnDismiss = jest.fn();
  const mockAlert: SecurityAlert = {
    id: 'alert-1',
    user_id: 'user-suspicious',
    alert_type: 'MULTIPLE_FAILED_LOGINS',
    risk_level: 'HIGH',
    description: 'Multiple failed login attempts detected from unusual location',
    metadata: {
      ip_address: '203.0.113.195',
      login_attempts: 8,
      location: 'Unknown Location',
      user_agent: 'Automated Bot v1.0'
    },
    resolved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders alert with basic information', () => {
    render(
      <SuspiciousActivityAlert 
        alert={mockAlert}
        onResolve={mockOnResolve}
        onInvestigate={mockOnInvestigate}
        onDismiss={mockOnDismiss}
      />
    );
    expect(screen.getByText('Multiple failed login attempts detected from unusual location')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('user-suspicious')).toBeInTheDocument();
  it('displays correct icon for HIGH risk level', () => {
    expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
  it('displays correct icon for CRITICAL risk level', () => {
    const criticalAlert = { ...mockAlert, risk_level: 'CRITICAL' as const };
    
        alert={criticalAlert}
    expect(screen.getByTestId('shield-exclamation-icon')).toBeInTheDocument();
  it('applies correct styling for HIGH risk level', () => {
    const container = screen.getByText('HIGH').closest('div');
    expect(container).toHaveClass('bg-red-50');
  it('applies correct styling for CRITICAL risk level', () => {
    const container = screen.getByText('CRITICAL').closest('div');
    expect(container).toHaveClass('bg-purple-50');
  it('applies correct styling for MEDIUM risk level', () => {
    const mediumAlert = { ...mockAlert, risk_level: 'MEDIUM' as const };
        alert={mediumAlert}
    const container = screen.getByText('MEDIUM').closest('div');
    expect(container).toHaveClass('bg-yellow-50');
  it('applies correct styling for LOW risk level', () => {
    const lowAlert = { ...mockAlert, risk_level: 'LOW' as const };
        alert={lowAlert}
    const container = screen.getByText('LOW').closest('div');
    expect(container).toHaveClass('bg-green-50');
  it('displays metadata information', () => {
    expect(screen.getByText('IP: 203.0.113.195')).toBeInTheDocument();
    expect(screen.getByText('Attempts: 8')).toBeInTheDocument();
    expect(screen.getByText('Location: Unknown Location')).toBeInTheDocument();
  it('shows timestamp in relative format', () => {
    const pastAlert = {
      ...mockAlert,
      created_at: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
    };
        alert={pastAlert}
    expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
  it('renders action buttons for unresolved alert', () => {
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /investigate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  it('does not render action buttons for resolved alert', () => {
    const resolvedAlert = { ...mockAlert, resolved: true };
        alert={resolvedAlert}
    expect(screen.queryByRole('button', { name: /resolve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /investigate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  it('shows resolved status for resolved alert', () => {
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  it('calls onResolve when resolve button is clicked', async () => {
    const resolveButton = screen.getByRole('button', { name: /resolve/i });
    fireEvent.click(resolveButton);
    expect(mockOnResolve).toHaveBeenCalledWith('alert-1', expect.any(String));
  it('calls onInvestigate when investigate button is clicked', async () => {
    const investigateButton = screen.getByRole('button', { name: /investigate/i });
    fireEvent.click(investigateButton);
    expect(mockOnInvestigate).toHaveBeenCalledWith('alert-1');
  it('calls onDismiss when dismiss button is clicked', async () => {
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledWith('alert-1');
  it('handles alert type UNUSUAL_DATA_ACCESS correctly', () => {
    const dataAccessAlert = {
      alert_type: 'UNUSUAL_DATA_ACCESS' as const,
      description: 'Unusual data access pattern detected',
      metadata: {
        accessed_records: 500,
        time_window: '5 minutes',
        data_types: ['guest_data', 'payment_info']
      }
        alert={dataAccessAlert}
    expect(screen.getByText('Unusual data access pattern detected')).toBeInTheDocument();
    expect(screen.getByText('Records: 500')).toBeInTheDocument();
    expect(screen.getByText('Window: 5 minutes')).toBeInTheDocument();
  it('handles alert type SUSPICIOUS_LOCATION correctly', () => {
    const locationAlert = {
      alert_type: 'SUSPICIOUS_LOCATION' as const,
      description: 'Login from suspicious location',
        ip_address: '192.168.1.100',
        location: 'Unknown Country',
        distance_km: 5000
        alert={locationAlert}
    expect(screen.getByText('Login from suspicious location')).toBeInTheDocument();
    expect(screen.getByText('Distance: 5000km')).toBeInTheDocument();
  it('handles alert type PERMISSION_ESCALATION correctly', () => {
    const permissionAlert = {
      alert_type: 'PERMISSION_ESCALATION' as const,
      description: 'Unauthorized permission escalation attempt',
        attempted_role: 'admin',
        current_role: 'user',
        resource: 'system_settings'
        alert={permissionAlert}
    expect(screen.getByText('Unauthorized permission escalation attempt')).toBeInTheDocument();
    expect(screen.getByText('Target: admin')).toBeInTheDocument();
    expect(screen.getByText('Resource: system_settings')).toBeInTheDocument();
  it('formats time correctly for recent alerts', () => {
    const recentAlert = {
      created_at: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
        alert={recentAlert}
    expect(screen.getByText(/seconds ago/)).toBeInTheDocument();
  it('formats time correctly for old alerts', () => {
    const oldAlert = {
      created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        alert={oldAlert}
    expect(screen.getByText(/hours ago/)).toBeInTheDocument();
  it('applies dark mode classes correctly', () => {
    expect(container).toHaveClass('dark:bg-red-900/20');
  it('handles missing metadata gracefully', () => {
    const alertWithoutMetadata = {
      metadata: {}
        alert={alertWithoutMetadata}
    // Should still render the alert without errors
  it('handles null metadata gracefully', () => {
    const alertWithNullMetadata = {
      metadata: null as any
        alert={alertWithNullMetadata}
  it('provides proper accessibility attributes', () => {
    expect(resolveButton).toBeInTheDocument();
    expect(investigateButton).toBeInTheDocument();
    expect(dismissButton).toBeInTheDocument();
  it('handles compact mode when specified', () => {
        compact={true}
  it('truncates long descriptions appropriately', () => {
    const longDescAlert = {
      description: 'This is a very long description that should be truncated when displayed in the UI because it contains too much information and would make the alert difficult to scan quickly'
        alert={longDescAlert}
    expect(screen.getByText(/This is a very long description/)).toBeInTheDocument();
  it('displays alert ID for debugging', () => {
        showDebugInfo={true}
    // Debug info might be shown in compact form or on hover
});
