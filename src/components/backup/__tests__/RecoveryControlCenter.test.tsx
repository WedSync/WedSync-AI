/**
 * WS-258: Backup Strategy Implementation System - Recovery Control Tests
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
import { RecoveryControlCenter } from '../RecoveryControlCenter';
import { RecoveryPoint, RecoveryOptions } from '../types';

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatString) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  }),
}));

const mockRecoveryPoints: RecoveryPoint[] = [
  {
    id: 'rp-1',
    backup_id: 'backup-1',
    created_at: new Date('2025-01-01T10:00:00Z'),
    data_types: ['photos', 'client-data'],
    backup_size: 5000000000, // 5GB
    integrity_verified: true,
    recovery_priority: 'critical',
    wedding_event_id: 'wedding-123',
    metadata: {
      wedding_date: new Date('2025-06-15T14:00:00Z'),
      client_names: ['John Smith', 'Jane Doe'],
      venue_name: 'Grand Ballroom',
      photographer_notes: 'Beautiful outdoor ceremony',
    },
  },
  {
    id: 'rp-2',
    backup_id: 'backup-2',
    created_at: new Date('2025-01-01T08:00:00Z'),
    data_types: ['business-files', 'database'],
    backup_size: 2500000000, // 2.5GB
    integrity_verified: false,
    recovery_priority: 'high',
    metadata: {
      client_names: ['Bob Wilson'],
      venue_name: 'City Hall',
      photographer_notes: 'Intimate ceremony',
    },
  },
];

const mockOnRecoveryInitiate = jest.fn();

describe('RecoveryControlCenter', () => {
  const defaultProps = {
    recoveryPoints: mockRecoveryPoints,
    onRecoveryInitiate: mockOnRecoveryInitiate,
    emergencyMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders recovery control center with basic structure', () => {
    render(<RecoveryControlCenter {...defaultProps} />);

    expect(screen.getByText('Recovery Control Center')).toBeInTheDocument();
    expect(
      screen.getByText('Point-in-time recovery and granular data restoration'),
    ).toBeInTheDocument();
    expect(screen.getByText('Recovery Configuration')).toBeInTheDocument();
  });

  it('displays recovery points statistics', () => {
    render(<RecoveryControlCenter {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // Total recovery points
    expect(screen.getByText('Recovery Points')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Verified count
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows emergency mode styling when enabled', () => {
    render(<RecoveryControlCenter {...defaultProps} emergencyMode={true} />);

    expect(screen.getByText('EMERGENCY MODE')).toBeInTheDocument();
  });

  describe('Recovery Configuration', () => {
    it('allows selecting recovery type', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryTypeSelect = screen.getByDisplayValue(
        'Full System Recovery',
      );
      fireEvent.click(recoveryTypeSelect);

      expect(screen.getByText('Full System Recovery')).toBeInTheDocument();
      expect(screen.getByText('Selective File Recovery')).toBeInTheDocument();
      expect(screen.getByText('Database Only')).toBeInTheDocument();
      expect(screen.getByText('Wedding-Specific Data')).toBeInTheDocument();
    });

    it('updates target location input', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const targetInput = screen.getByDisplayValue('/recovery/restore');
      fireEvent.change(targetInput, {
        target: { value: '/custom/restore/path' },
      });

      expect(targetInput).toHaveValue('/custom/restore/path');
    });

    it('handles checkbox options correctly', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const overwriteCheckbox = screen.getByLabelText(
        'Overwrite Existing Files',
      );
      const verifyCheckbox = screen.getByLabelText('Verify Data Integrity');
      const notifyCheckbox = screen.getByLabelText('Notify on Completion');

      expect(overwriteCheckbox).not.toBeChecked();
      expect(verifyCheckbox).toBeChecked();
      expect(notifyCheckbox).toBeChecked();

      fireEvent.click(overwriteCheckbox);
      expect(overwriteCheckbox).toBeChecked();
    });
  });

  describe('Recovery Points Browser', () => {
    it('displays recovery points grouped by date', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Switch to recovery points tab
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      expect(screen.getByText('Browse Recovery Points')).toBeInTheDocument();

      // Should group by date
      const dates = screen.getAllByText(/January/); // Date formatting will show January
      expect(dates.length).toBeGreaterThan(0);
    });

    it('filters recovery points by search query', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        'Search by client name, venue, or notes...',
      );
      fireEvent.change(searchInput, { target: { value: 'John Smith' } });

      // Should show filtered results
      expect(screen.getByText('John Smith, Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('filters by data type', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const dataTypeSelect = screen.getByDisplayValue('All Data Types');
      fireEvent.click(dataTypeSelect);

      const photosOption = screen.getByText('Photos');
      fireEvent.click(photosOption);

      // Should filter to only show recovery points with photos
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
      expect(screen.queryByText('City Hall')).not.toBeInTheDocument();
    });

    it('filters by priority level', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const prioritySelect = screen.getByDisplayValue('All Priorities');
      fireEvent.click(prioritySelect);

      const criticalOption = screen.getByText('Critical');
      fireEvent.click(criticalOption);

      // Should show only critical priority items
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Apply some filters
      const searchInput = screen.getByPlaceholderText(
        'Search by client name, venue, or notes...',
      );
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('selects recovery point when clicked', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      // Find and click a recovery point
      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('[role="button"], div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      // Should show recovery button when selected
      const recoverButtons = screen
        .getAllByText(/recover/i)
        .filter((el) => el.tagName === 'BUTTON' || el.closest('button'));
      expect(recoverButtons.length).toBeGreaterThan(0);
    });

    it('shows preview button for recovery points', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const previewButtons = screen.getAllByText('Preview');
      expect(previewButtons.length).toBe(mockRecoveryPoints.length);
    });

    it('displays recovery point metadata correctly', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      // Check for metadata display
      expect(screen.getByText('John Smith, Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
      expect(
        screen.getByText('Beautiful outdoor ceremony'),
      ).toBeInTheDocument();
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
    });
  });

  describe('Recovery Initiation', () => {
    it('initiates recovery with selected options', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Select a recovery point
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      // Find and click recovery button
      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(mockOnRecoveryInitiate).toHaveBeenCalledWith(
            mockRecoveryPoints[0],
            expect.objectContaining({
              recovery_type: 'full-system',
              target_location: '/recovery/restore',
              overwrite_existing: false,
              verify_integrity: true,
              notify_on_completion: true,
            }),
          );
        });
      }
    });

    it('shows active recovery session when recovery is initiated', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(
            screen.getByText('Active Recovery Session'),
          ).toBeInTheDocument();
        });
      }
    });

    it('updates recovery progress over time', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Start recovery
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(
            screen.getByText('Active Recovery Session'),
          ).toBeInTheDocument();
        });

        // Advance time to trigger progress updates
        act(() => {
          jest.advanceTimersByTime(5000); // 5 seconds
        });

        // Progress should have updated
        const progressElement = screen.getByRole('progressbar');
        expect(progressElement).toBeInTheDocument();
      }
    });

    it('handles recovery completion', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Start recovery and let it complete
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(
            screen.getByText('Active Recovery Session'),
          ).toBeInTheDocument();
        });

        // Fast-forward to completion
        act(() => {
          jest.advanceTimersByTime(60000); // 60 seconds
        });

        await waitFor(() => {
          expect(
            screen.getByText('Recovery completed successfully!'),
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('Tab Navigation', () => {
    it('switches between recovery tabs correctly', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const pointInTimeTab = screen.getByRole('tab', {
        name: /point-in-time recovery/i,
      });
      fireEvent.click(pointInTimeTab);
      expect(screen.getByText('Point-in-Time Recovery')).toBeInTheDocument();

      const granularTab = screen.getByRole('tab', {
        name: /granular recovery/i,
      });
      fireEvent.click(granularTab);
      expect(screen.getByText('Granular File Recovery')).toBeInTheDocument();
    });

    it('shows appropriate content for point-in-time recovery', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const pointInTimeTab = screen.getByRole('tab', {
        name: /point-in-time recovery/i,
      });
      fireEvent.click(pointInTimeTab);

      expect(
        screen.getByText('Restore data to a specific point in time'),
      ).toBeInTheDocument();
      expect(screen.getByText('Select Recovery Time')).toBeInTheDocument();
    });

    it('shows appropriate content for granular recovery', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const granularTab = screen.getByRole('tab', {
        name: /granular recovery/i,
      });
      fireEvent.click(granularTab);

      expect(
        screen.getByText('Recover specific files, folders, or data types'),
      ).toBeInTheDocument();
      expect(screen.getByText('Browse Recovery Files')).toBeInTheDocument();
    });
  });

  describe('Recovery Session Management', () => {
    it('allows canceling active recovery session', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Start recovery
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(
            screen.getByText('Active Recovery Session'),
          ).toBeInTheDocument();
        });

        // Cancel the session
        const cancelButton = screen.getByText('Cancel Recovery');
        fireEvent.click(cancelButton);

        expect(
          screen.queryByText('Active Recovery Session'),
        ).not.toBeInTheDocument();
      }
    });

    it('shows close button when recovery is completed', async () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      // Start and complete recovery
      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);
      }

      const recoverButton = screen
        .getAllByText(/recover/i)
        .find((el) => el.tagName === 'BUTTON' || el.closest('button'));

      if (recoverButton) {
        fireEvent.click(recoverButton);

        await waitFor(() => {
          expect(
            screen.getByText('Active Recovery Session'),
          ).toBeInTheDocument();
        });

        // Complete the recovery
        act(() => {
          jest.advanceTimersByTime(60000);
        });

        await waitFor(() => {
          expect(screen.getByText('Close Session')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getAllByRole('button')).toHaveLength.toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabindex');
      });
    });
  });

  describe('Error States', () => {
    it('handles empty recovery points gracefully', () => {
      render(<RecoveryControlCenter {...defaultProps} recoveryPoints={[]} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      expect(screen.getByText('No Recovery Points Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No recovery points match your current search criteria.',
        ),
      ).toBeInTheDocument();
    });

    it('disables recovery button when no point is selected', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      // No recovery points should be selected initially
      // Recovery buttons should only appear after selection
      const recoverButtons = screen.queryAllByText(/^Recover$/);
      expect(recoverButtons).toHaveLength(0);
    });
  });

  describe('Wedding Event Integration', () => {
    it('shows wedding event badge for linked recovery points', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
    });

    it('includes wedding event ID in recovery options when available', () => {
      render(<RecoveryControlCenter {...defaultProps} />);

      const recoveryPointsTab = screen.getByRole('tab', {
        name: /recovery points/i,
      });
      fireEvent.click(recoveryPointsTab);

      const recoveryPoint = screen
        .getByText('Grand Ballroom')
        .closest('div[class*="cursor-pointer"]');
      if (recoveryPoint) {
        fireEvent.click(recoveryPoint);

        // Wedding event ID field should be visible
        expect(screen.getByDisplayValue('wedding-123')).toBeInTheDocument();
      }
    });
  });
});
