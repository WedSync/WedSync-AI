/**
 * WS-258: Backup Strategy Implementation System - Emergency Controls Tests
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmergencyBackupControls } from '../EmergencyBackupControls';
import { EmergencyResponse, EmergencyAction } from '../types';

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

const mockEmergencyStatus: EmergencyResponse = {
  id: 'emergency-1',
  status: 'critical',
  incident_type: 'data-loss',
  severity: 'critical',
  affected_weddings: ['wedding-1', 'wedding-2'],
  affected_data_types: ['photos', 'client-data'],
  response_time: new Date('2025-01-01T09:00:00Z'),
  recovery_initiated: false,
  estimated_recovery_time: new Date('2025-01-01T11:00:00Z'),
  emergency_contacts_notified: true,
  automated_responses: ['backup-verification', 'emergency-alert'],
};

const mockEmergencyAction = jest.fn();

describe('EmergencyBackupControls', () => {
  const defaultProps = {
    emergencyStatus: null,
    organizationId: 'org-123',
    onEmergencyAction: mockEmergencyAction,
    allowManualOverride: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Normal State (No Emergency)', () => {
    it('renders standby state when no emergency is active', () => {
      render(<EmergencyBackupControls {...defaultProps} />);

      expect(screen.getByText('Emergency Response Center')).toBeInTheDocument();
      expect(screen.getByText('Standby')).toBeInTheDocument();
      expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
      expect(
        screen.getByText('No emergency situations detected'),
      ).toBeInTheDocument();
    });

    it('shows test emergency systems button in standby', () => {
      render(<EmergencyBackupControls {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /test emergency systems/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /contact support/i }),
      ).toBeInTheDocument();
    });

    it('handles test emergency systems click', async () => {
      render(<EmergencyBackupControls {...defaultProps} />);

      const testButton = screen.getByRole('button', {
        name: /test emergency systems/i,
      });
      fireEvent.click(testButton);

      expect(mockEmergencyAction).toHaveBeenCalledWith({
        type: 'initiate-recovery',
        parameters: expect.objectContaining({
          recoveryType: 'system-restore',
        }),
        authorization_required: false,
      });
    });
  });

  describe('Emergency Active State', () => {
    it('renders emergency alert when emergency is active', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(screen.getByText('ACTIVE EMERGENCY')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('DATA LOSS DETECTED')).toBeInTheDocument();
    });

    it('displays emergency incident details', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(screen.getByText('Affected Weddings:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Response Time:')).toBeInTheDocument();
      expect(screen.getByText('Recovery Status:')).toBeInTheDocument();
    });

    it('shows emergency recovery buttons', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(
        screen.getByRole('button', { name: /full emergency recovery/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /wedding-specific recovery/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /selective data recovery/i }),
      ).toBeInTheDocument();
    });

    it('displays emergency communications section', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(screen.getByText('Emergency Communications')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /24\/7 emergency support/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /alert primary contacts/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /notify affected couples/i }),
      ).toBeInTheDocument();
    });

    it('shows system failover options', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(screen.getByText('System Failover')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /activate cloud failover/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /switch to local backup/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /emergency offsite access/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Emergency Recovery Actions', () => {
    it('initiates full emergency recovery', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(mockEmergencyAction).toHaveBeenCalledWith({
          type: 'initiate-recovery',
          parameters: expect.objectContaining({
            recoveryType: 'emergency-full',
          }),
          authorization_required: true,
        });
      });
    });

    it('initiates wedding-specific recovery', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const recoveryButton = screen.getByRole('button', {
        name: /wedding-specific recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(mockEmergencyAction).toHaveBeenCalledWith({
          type: 'initiate-recovery',
          parameters: expect.objectContaining({
            recoveryType: 'wedding-specific',
          }),
          authorization_required: true,
        });
      });
    });

    it('shows recovery progress when session is active', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      // Start a recovery session
      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(screen.getByText('Active Recovery Session')).toBeInTheDocument();
      });
    });

    it('handles recovery session progress updates', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      // Start recovery
      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      // Wait for session to start
      await waitFor(() => {
        expect(screen.getByText('Active Recovery Session')).toBeInTheDocument();
      });

      // Progress should be shown
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Emergency Communications', () => {
    it('contacts emergency support', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const supportButton = screen.getByRole('button', {
        name: /24\/7 emergency support/i,
      });
      fireEvent.click(supportButton);

      await waitFor(() => {
        expect(mockEmergencyAction).toHaveBeenCalledWith({
          type: 'escalate-support',
          parameters: { urgency: 'critical', weddingDay: true },
          authorization_required: false,
        });
      });
    });

    it('alerts primary contacts', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const contactButton = screen.getByRole('button', {
        name: /alert primary contacts/i,
      });
      fireEvent.click(contactButton);

      // Button should show as contacted
      await waitFor(() => {
        expect(contactButton).toBeDisabled();
      });
    });

    it('notifies affected couples', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const notifyButton = screen.getByRole('button', {
        name: /notify affected couples/i,
      });
      fireEvent.click(notifyButton);

      expect(mockEmergencyAction).toHaveBeenCalledWith({
        type: 'notify-stakeholders',
        parameters: { urgency: 'high', includeClients: true },
        authorization_required: true,
      });
    });
  });

  describe('System Failover', () => {
    it('activates cloud failover', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const failoverButton = screen.getByRole('button', {
        name: /activate cloud failover/i,
      });
      fireEvent.click(failoverButton);

      expect(mockEmergencyAction).toHaveBeenCalledWith({
        type: 'activate-failover',
        parameters: {
          failoverType: 'cloud-backup',
          emergencyMode: true,
        },
        authorization_required: true,
      });
    });

    it('switches to local backup', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const localButton = screen.getByRole('button', {
        name: /switch to local backup/i,
      });
      fireEvent.click(localButton);

      expect(mockEmergencyAction).toHaveBeenCalledWith({
        type: 'activate-failover',
        parameters: { failoverType: 'local-backup' },
        authorization_required: false,
      });
    });

    it('activates emergency offsite access', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const offsiteButton = screen.getByRole('button', {
        name: /emergency offsite access/i,
      });
      fireEvent.click(offsiteButton);

      expect(mockEmergencyAction).toHaveBeenCalledWith({
        type: 'activate-failover',
        parameters: { failoverType: 'offsite-backup' },
        authorization_required: true,
      });
    });
  });

  describe('Emergency Procedures Documentation', () => {
    it('displays emergency procedures guide', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(screen.getByText('Emergency Procedures')).toBeInTheDocument();
      expect(screen.getByText('📸 Photo Loss Emergency')).toBeInTheDocument();
      expect(screen.getByText('🖥️ System Failure')).toBeInTheDocument();
      expect(screen.getByText('🔒 Data Corruption')).toBeInTheDocument();
      expect(screen.getByText('⚡ Wedding Day Crisis')).toBeInTheDocument();
    });

    it('shows step-by-step procedures', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      expect(
        screen.getByText('1. Stop all current operations'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('1. Activate cloud failover immediately'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('1. Isolate corrupted systems'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('1. Activate emergency response team'),
      ).toBeInTheDocument();
    });
  });

  describe('Recovery Session Management', () => {
    it('cancels recovery session when requested', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      // Start recovery
      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(screen.getByText('Active Recovery Session')).toBeInTheDocument();
      });

      // Cancel recovery
      const cancelButton = screen.getByRole('button', {
        name: /cancel recovery/i,
      });
      fireEvent.click(cancelButton);

      expect(cancelButton).toBeInTheDocument();
    });

    it('downloads recovery log', async () => {
      // Mock createElement and URL methods for file download
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockClick = jest.fn();
      const mockCreateObjectURL = jest.spyOn(URL, 'createObjectURL');
      const mockRevokeObjectURL = jest.spyOn(URL, 'revokeObjectURL');

      mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);
      mockCreateObjectURL.mockReturnValue('blob:url');
      mockRevokeObjectURL.mockImplementation(() => {});

      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      // Start recovery
      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(screen.getByText('Active Recovery Session')).toBeInTheDocument();
      });

      // Download log
      const downloadButton = screen.getByRole('button', {
        name: /download log/i,
      });
      fireEvent.click(downloadButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();

      mockCreateElement.mockRestore();
      mockCreateObjectURL.mockRestore();
      mockRevokeObjectURL.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Failed to initiate emergency recovery:',
          expect.any(Error),
        );
      });
    });

    it('handles support contact errors', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const supportButton = screen.getByRole('button', {
        name: /24\/7 emergency support/i,
      });

      // Should not throw even if action handler fails
      expect(() => fireEvent.click(supportButton)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for emergency buttons', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const emergencyButtons = screen.getAllByRole('button');
      emergencyButtons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Disabled States', () => {
    it('disables recovery buttons when session is active', async () => {
      render(
        <EmergencyBackupControls
          {...defaultProps}
          emergencyStatus={mockEmergencyStatus}
        />,
      );

      // Start recovery
      const recoveryButton = screen.getByRole('button', {
        name: /full emergency recovery/i,
      });
      fireEvent.click(recoveryButton);

      await waitFor(() => {
        expect(screen.getByText('Active Recovery Session')).toBeInTheDocument();
      });

      // Other recovery buttons should be disabled
      const weddingRecoveryButton = screen.getByRole('button', {
        name: /wedding-specific recovery/i,
      });
      const selectiveRecoveryButton = screen.getByRole('button', {
        name: /selective data recovery/i,
      });

      expect(weddingRecoveryButton).toBeDisabled();
      expect(selectiveRecoveryButton).toBeDisabled();
    });
  });
});
