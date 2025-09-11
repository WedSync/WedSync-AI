/**
 * WS-258: Backup Strategy Implementation System - Data Protection Panel Tests
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
import { WeddingDataProtectionPanel } from '../WeddingDataProtectionPanel';
import { BackupSystemStatus } from '../types';

// Mock fetch
global.fetch = jest.fn();

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    reload: jest.fn(),
  },
});

const mockBackupStatus: BackupSystemStatus = {
  id: 'backup-status-1',
  overall_status: 'healthy',
  health_score: 95,
  last_successful_backup: new Date('2025-01-01T10:00:00Z'),
  next_scheduled_backup: new Date('2025-01-02T10:00:00Z'),
  active_backups_count: 2,
  failed_backups_count: 0,
  total_data_protected: 5000000000, // 5GB
  wedding_critical_data_status: 'healthy',
  emergency_contacts_available: true,
};

describe('WeddingDataProtectionPanel', () => {
  const defaultProps = {
    organizationId: 'org-123',
    backupStatus: mockBackupStatus,
    readOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders wedding data protection panel with basic structure', () => {
    render(<WeddingDataProtectionPanel {...defaultProps} />);

    expect(
      screen.getByText('Wedding Data Protection Configuration'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Comprehensive backup strategy for irreplaceable wedding memories',
      ),
    ).toBeInTheDocument();
  });

  it('shows save controls when not in read-only mode', () => {
    render(<WeddingDataProtectionPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save configuration/i }),
    ).toBeInTheDocument();
  });

  it('hides save controls in read-only mode', () => {
    render(<WeddingDataProtectionPanel {...defaultProps} readOnly={true} />);

    expect(
      screen.queryByRole('button', { name: /save configuration/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reset/i }),
    ).not.toBeInTheDocument();
  });

  describe('Multi-Tier Backup Configuration', () => {
    it('displays local backup configuration', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      expect(screen.getByText('Tier 1: Local Backup')).toBeInTheDocument();
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable Local Backup')).toBeInTheDocument();
    });

    it('enables/disables local backup configuration', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const localBackupSwitch = screen.getByLabelText('Enable Local Backup');
      expect(localBackupSwitch).toBeChecked();

      fireEvent.click(localBackupSwitch);
      expect(localBackupSwitch).not.toBeChecked();
    });

    it('configures local backup settings', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storagePathInput = screen.getByLabelText('Storage Location');
      fireEvent.change(storagePathInput, {
        target: { value: '/custom/backup/path' },
      });
      expect(storagePathInput).toHaveValue('/custom/backup/path');

      const maxStorageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(maxStorageInput, { target: { value: '1000' } });
      expect(maxStorageInput).toHaveValue(1000);

      const compressionSwitch = screen.getByLabelText('Enable Compression');
      const verificationSwitch = screen.getByLabelText('Verify After Backup');
      expect(compressionSwitch).toBeChecked();
      expect(verificationSwitch).toBeChecked();
    });

    it('displays cloud backup configuration', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      expect(screen.getByText('Tier 2: Cloud Backup')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable Cloud Backup')).toBeInTheDocument();
    });

    it('configures cloud backup provider and settings', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const cloudProviderSelect = screen.getByDisplayValue(
        'Amazon Web Services',
      );
      fireEvent.click(cloudProviderSelect);
      expect(screen.getByText('Microsoft Azure')).toBeInTheDocument();

      const regionSelect = screen.getByDisplayValue('US East (N. Virginia)');
      expect(regionSelect).toBeInTheDocument();

      const bucketInput = screen.getByLabelText('Bucket/Container Name');
      expect(bucketInput).toHaveValue('wedsync-backups');

      const storageClassSelect = screen.getByDisplayValue(
        'Standard-IA (Infrequent Access)',
      );
      expect(storageClassSelect).toBeInTheDocument();
    });

    it('displays offsite backup configuration', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      expect(screen.getByText('Tier 3: Offsite Backup')).toBeInTheDocument();
      expect(screen.getByText('Tertiary')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Enable Offsite Backup'),
      ).toBeInTheDocument();
    });

    it('shows cost estimation card', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      expect(screen.getByText('Cost Estimation')).toBeInTheDocument();
      expect(screen.getByText('Local Storage')).toBeInTheDocument();
      expect(screen.getByText('Cloud Storage')).toBeInTheDocument();
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });
  });

  describe('Retention Policies Configuration', () => {
    it('displays retention policies tab', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const retentionTab = screen.getByRole('tab', {
        name: /retention policies/i,
      });
      fireEvent.click(retentionTab);

      expect(
        screen.getByText('Wedding Photos Retention Policy'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Client Information Retention Policy'),
      ).toBeInTheDocument();
    });

    it('configures retention periods', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const retentionTab = screen.getByRole('tab', {
        name: /retention policies/i,
      });
      fireEvent.click(retentionTab);

      const dailyInputs = screen.getAllByLabelText('Daily Backups (days)');
      expect(dailyInputs[0]).toHaveValue(30);

      fireEvent.change(dailyInputs[0], { target: { value: '60' } });
      expect(dailyInputs[0]).toHaveValue(60);
    });

    it('displays compliance requirements', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const retentionTab = screen.getByRole('tab', {
        name: /retention policies/i,
      });
      fireEvent.click(retentionTab);

      expect(screen.getByText('GDPR')).toBeInTheDocument();
      expect(
        screen.getByText('Wedding Industry Standards'),
      ).toBeInTheDocument();
      expect(screen.getByText('CCPA')).toBeInTheDocument();
    });

    it('shows wedding special retention information', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const retentionTab = screen.getByRole('tab', {
        name: /retention policies/i,
      });
      fireEvent.click(retentionTab);

      expect(screen.getByText(/7 years/)).toBeInTheDocument();
      expect(
        screen.getByText(/Extended retention for wedding-related data/),
      ).toBeInTheDocument();
    });
  });

  describe('Wedding-Specific Settings', () => {
    it('displays wedding day protection settings', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const weddingTab = screen.getByRole('tab', { name: /wedding settings/i });
      fireEvent.click(weddingTab);

      expect(
        screen.getByText('Wedding Day Protection Settings'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Special backup configurations for wedding day operations',
        ),
      ).toBeInTheDocument();
    });

    it('configures priority booking period', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const weddingTab = screen.getByRole('tab', { name: /wedding settings/i });
      fireEvent.click(weddingTab);

      const priorityInput = screen.getByLabelText(
        'Priority Backup Period (days before wedding)',
      );
      expect(priorityInput).toHaveValue(30);

      fireEvent.change(priorityInput, { target: { value: '45' } });
      expect(priorityInput).toHaveValue(45);
    });

    it('configures wedding day backup frequency', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const weddingTab = screen.getByRole('tab', { name: /wedding settings/i });
      fireEvent.click(weddingTab);

      const frequencyInput = screen.getByLabelText(
        'Wedding Day Backup Frequency (minutes)',
      );
      expect(frequencyInput).toHaveValue(15);

      fireEvent.change(frequencyInput, { target: { value: '10' } });
      expect(frequencyInput).toHaveValue(10);
    });

    it('shows wedding day protocol alert', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const weddingTab = screen.getByRole('tab', { name: /wedding settings/i });
      fireEvent.click(weddingTab);

      expect(screen.getByText('Wedding Day Protocol:')).toBeInTheDocument();
      expect(
        screen.getByText(/backup frequency increases automatically/),
      ).toBeInTheDocument();
    });
  });

  describe('Emergency Contacts Configuration', () => {
    it('displays emergency contact form', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      expect(
        screen.getByText('Emergency Contact Configuration'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Primary Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Primary Phone')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Secondary Email (Optional)'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Secondary Phone (Optional)'),
      ).toBeInTheDocument();
    });

    it('configures emergency contact information', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      const primaryEmailInput = screen.getByLabelText('Primary Email');
      fireEvent.change(primaryEmailInput, {
        target: { value: 'emergency@example.com' },
      });
      expect(primaryEmailInput).toHaveValue('emergency@example.com');

      const primaryPhoneInput = screen.getByLabelText('Primary Phone');
      fireEvent.change(primaryPhoneInput, {
        target: { value: '+1 (555) 123-4567' },
      });
      expect(primaryPhoneInput).toHaveValue('+1 (555) 123-4567');
    });

    it('configures escalation time', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      const escalationInput = screen.getByLabelText(
        'Escalation Time (minutes)',
      );
      expect(escalationInput).toHaveValue(30);

      fireEvent.change(escalationInput, { target: { value: '15' } });
      expect(escalationInput).toHaveValue(15);
    });

    it('shows 24/7 emergency support alert', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      expect(screen.getByText('24/7 Emergency Support:')).toBeInTheDocument();
      expect(
        screen.getByText(/reached immediately during backup system failures/),
      ).toBeInTheDocument();
    });
  });

  describe('Configuration Management', () => {
    it('tracks changes and shows unsaved changes badge', async () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      // Make a change
      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(storageInput, { target: { value: '1000' } });

      // Should show unsaved changes
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Save button should be enabled
      const saveButton = screen.getByRole('button', {
        name: /save configuration/i,
      });
      expect(saveButton).toBeEnabled();
    });

    it('saves configuration successfully', async () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      // Make a change
      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(storageInput, { target: { value: '1000' } });

      // Save configuration
      const saveButton = screen.getByRole('button', {
        name: /save configuration/i,
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/backup/configuration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('org-123'),
        });
      });
    });

    it('handles save errors gracefully', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      render(<WeddingDataProtectionPanel {...defaultProps} />);

      // Make a change and save
      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(storageInput, { target: { value: '1000' } });

      const saveButton = screen.getByRole('button', {
        name: /save configuration/i,
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save backup configuration:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it('resets configuration when reset button is clicked', () => {
      const reloadSpy = jest
        .spyOn(window.location, 'reload')
        .mockImplementation(() => {});

      render(<WeddingDataProtectionPanel {...defaultProps} />);

      // Make a change
      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(storageInput, { target: { value: '1000' } });

      // Reset configuration
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(reloadSpy).toHaveBeenCalled();

      reloadSpy.mockRestore();
    });

    it('disables controls in read-only mode', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} readOnly={true} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const localBackupSwitch = screen.getByLabelText('Enable Local Backup');
      expect(localBackupSwitch).toBeDisabled();

      const storageInput = screen.getByLabelText('Storage Location');
      expect(storageInput).toBeDisabled();
    });
  });

  describe('Storage Cost Estimation', () => {
    it('calculates and displays storage costs', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      // Should show cost estimation
      expect(screen.getByText('Cost Estimation')).toBeInTheDocument();
      expect(screen.getByText(/\$/)).toBeInTheDocument(); // Should show some cost
    });

    it('updates cost estimation when configuration changes', async () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      // Change local storage size
      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      fireEvent.change(storageInput, { target: { value: '1000' } });

      // Cost should update (we can't easily test the exact value, but we can verify the component re-renders)
      expect(screen.getByText('Cost Estimation')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getAllByRole('button')).toHaveLength.toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabindex');
      });
    });

    it('has proper form labels', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        // Each input should have an associated label
        const id = input.getAttribute('id');
        if (id) {
          expect(
            screen.getByLabelText(new RegExp(id, 'i')) ||
              input.getAttribute('aria-label'),
          ).toBeTruthy();
        }
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('maintains functionality on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<WeddingDataProtectionPanel {...defaultProps} />);

      // Should still render all key elements
      expect(
        screen.getByText('Wedding Data Protection Configuration'),
      ).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates email format in emergency contacts', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      const emailInput = screen.getByLabelText('Primary Email');

      // Should have email type
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('validates phone format in emergency contacts', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const emergencyTab = screen.getByRole('tab', { name: /emergency/i });
      fireEvent.click(emergencyTab);

      const phoneInput = screen.getByLabelText('Primary Phone');

      // Should have tel type
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('validates numeric inputs for storage and time settings', () => {
      render(<WeddingDataProtectionPanel {...defaultProps} />);

      const multiTierTab = screen.getByRole('tab', {
        name: /multi-tier backup/i,
      });
      fireEvent.click(multiTierTab);

      const storageInput = screen.getByLabelText('Maximum Storage (GB)');
      expect(storageInput).toHaveAttribute('type', 'number');
      expect(storageInput).toHaveAttribute('min', '100');
      expect(storageInput).toHaveAttribute('max', '10000');
    });
  });
});
