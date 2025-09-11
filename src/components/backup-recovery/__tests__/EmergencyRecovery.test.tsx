import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmergencyRecovery from '../EmergencyRecovery';

// Mock data for testing
const mockAvailableBackups = [
  {
    id: 'backup-001',
    timestamp: '2025-01-22T10:00:00Z',
    type: 'scheduled',
    status: 'completed',
    size: '2.1 GB',
    weddingCount: 15,
    duration: '12m 34s',
    dataTypes: ['guest-lists', 'photos', 'timelines'],
    integrity: 'verified',
    encryption: 'encrypted',
  },
  {
    id: 'backup-002',
    timestamp: '2025-01-22T06:00:00Z',
    type: 'manual',
    status: 'completed',
    size: '1.8 GB',
    weddingCount: 12,
    duration: '8m 45s',
    dataTypes: ['guest-lists', 'forms'],
    integrity: 'verified',
    encryption: 'encrypted',
  },
];

const mockAffectedWeddings = [
  {
    weddingId: 'wedding-001',
    coupleName: 'Sarah & John',
    weddingDate: '2025-01-25T14:00:00Z',
    daysUntil: 3,
    urgencyLevel: 'high',
    affectedSystems: ['guest-list', 'timeline'],
    dataLossRisk: 'moderate',
    businessImpact: 'high',
  },
  {
    weddingId: 'wedding-002',
    coupleName: 'Emma & David',
    weddingDate: '2025-01-24T15:30:00Z',
    daysUntil: 2,
    urgencyLevel: 'critical',
    affectedSystems: ['photos', 'timeline', 'contracts'],
    dataLossRisk: 'high',
    businessImpact: 'critical',
  },
];

const mockEmergencyContext = {
  incidentId: 'incident-001',
  incidentType: 'data-corruption',
  severity: 'critical',
  detectedAt: '2025-01-22T11:30:00Z',
  affectedSystems: ['database', 'photo-storage'],
  estimatedImpactUsers: 145,
};

describe('EmergencyRecovery', () => {
  const mockOnInitiateRecovery = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders emergency recovery interface with critical incident alert', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Emergency Data Recovery')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL INCIDENT')).toBeInTheDocument();
    expect(screen.getByText('incident-001')).toBeInTheDocument();
    expect(screen.getByText('data-corruption')).toBeInTheDocument();
  });

  it('displays affected weddings with urgency indicators', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Sarah & John')).toBeInTheDocument();
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
    expect(screen.getByText('3 days until wedding')).toBeInTheDocument();
    expect(screen.getByText('2 days until wedding')).toBeInTheDocument();

    // Check urgency levels
    expect(screen.getByText('HIGH URGENCY')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL URGENCY')).toBeInTheDocument();
  });

  it('shows available backup options with selection functionality', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('2.1 GB')).toBeInTheDocument();
    expect(screen.getByText('1.8 GB')).toBeInTheDocument();
    expect(screen.getByText('15 weddings')).toBeInTheDocument();
    expect(screen.getByText('12 weddings')).toBeInTheDocument();

    // Test backup selection
    const firstBackupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(firstBackupRadio);

    expect(firstBackupRadio).toBeChecked();
  });

  it('displays recovery scope selection options', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Check for recovery scope options
    expect(screen.getByText('Full System Recovery')).toBeInTheDocument();
    expect(screen.getByText('Critical Data Only')).toBeInTheDocument();
    expect(screen.getByText('Affected Weddings Only')).toBeInTheDocument();

    // Test scope selection
    const criticalDataRadio = screen.getByRole('radio', {
      name: /critical data only/i,
    });
    await user.click(criticalDataRadio);

    expect(criticalDataRadio).toBeChecked();
  });

  it('handles emergency recovery initiation with form submission', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select a backup
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(backupRadio);

    // Select recovery scope
    const scopeRadio = screen.getByRole('radio', {
      name: /critical data only/i,
    });
    await user.click(scopeRadio);

    // Click emergency recovery button
    const recoveryButton = screen.getByRole('button', {
      name: /initiate emergency recovery/i,
    });
    await user.click(recoveryButton);

    await waitFor(() => {
      expect(mockOnInitiateRecovery).toHaveBeenCalledWith(
        mockAvailableBackups[0].id,
        expect.objectContaining({
          scope: 'critical-data',
          weddingIds: expect.any(Array),
        }),
      );
    });
  });

  it('shows recovery impact assessment when backup and scope are selected', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select backup and scope
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(backupRadio);

    const scopeRadio = screen.getByRole('radio', {
      name: /critical data only/i,
    });
    await user.click(scopeRadio);

    await waitFor(() => {
      expect(
        screen.getByText('Recovery Impact Assessment'),
      ).toBeInTheDocument();
      expect(screen.getByText(/estimated duration/i)).toBeInTheDocument();
      expect(screen.getByText(/data loss risk/i)).toBeInTheDocument();
      expect(screen.getByText(/affected users/i)).toBeInTheDocument();
    });
  });

  it('displays wedding countdown timers with real-time updates', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Check for countdown displays
    expect(screen.getByText('3 days until wedding')).toBeInTheDocument();
    expect(screen.getByText('2 days until wedding')).toBeInTheDocument();
  });

  it('handles backup integrity verification display', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('ENCRYPTED')).toBeInTheDocument();
  });

  it('shows confirmation dialog for emergency recovery', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select backup and scope
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(backupRadio);

    const scopeRadio = screen.getByRole('radio', {
      name: /full system recovery/i,
    });
    await user.click(scopeRadio);

    // Click emergency recovery - should show confirmation
    const recoveryButton = screen.getByRole('button', {
      name: /initiate emergency recovery/i,
    });
    await user.click(recoveryButton);

    await waitFor(() => {
      expect(
        screen.getByText(/confirm emergency recovery/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/this action cannot be undone/i),
      ).toBeInTheDocument();
    });
  });

  it('handles cancellation of emergency recovery', async () => {
    const user = userEvent.setup();

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', {
      name: /cancel recovery/i,
    });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables recovery button when no backup is selected', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    const recoveryButton = screen.getByRole('button', {
      name: /initiate emergency recovery/i,
    });
    expect(recoveryButton).toBeDisabled();
  });

  it('shows loading state during recovery initiation', async () => {
    const user = userEvent.setup();

    // Mock a slow recovery function
    const slowMockOnInitiateRecovery = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={slowMockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select backup and scope
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(backupRadio);

    const scopeRadio = screen.getByRole('radio', {
      name: /critical data only/i,
    });
    await user.click(scopeRadio);

    // Click recovery button
    const recoveryButton = screen.getByRole('button', {
      name: /initiate emergency recovery/i,
    });
    await user.click(recoveryButton);

    expect(screen.getByText(/initiating recovery/i)).toBeInTheDocument();
    expect(recoveryButton).toBeDisabled();
  });

  it('displays error message on recovery failure', async () => {
    const user = userEvent.setup();

    // Mock failed recovery
    const failedMockOnInitiateRecovery = vi
      .fn()
      .mockRejectedValue(
        new Error('Recovery failed: Database connection timeout'),
      );

    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={failedMockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select backup and scope
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    await user.click(backupRadio);

    const scopeRadio = screen.getByRole('radio', {
      name: /critical data only/i,
    });
    await user.click(scopeRadio);

    // Click recovery button
    const recoveryButton = screen.getByRole('button', {
      name: /initiate emergency recovery/i,
    });
    await user.click(recoveryButton);

    await waitFor(() => {
      expect(
        screen.getByText(/recovery failed: database connection timeout/i),
      ).toBeInTheDocument();
    });
  });

  it('provides accessible navigation and ARIA labels', () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/emergency recovery interface/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/affected weddings list/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/backup selection/i)).toBeInTheDocument();
  });

  it('handles keyboard navigation for emergency actions', async () => {
    render(
      <EmergencyRecovery
        availableBackups={mockAvailableBackups}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    // Select backup using keyboard
    const backupRadio = screen.getByRole('radio', {
      name: /select backup from/i,
    });
    backupRadio.focus();
    fireEvent.keyDown(backupRadio, { key: 'Space' });

    expect(backupRadio).toBeChecked();
  });

  it('displays backup age and recency indicators', () => {
    const recentBackup = {
      ...mockAvailableBackups[0],
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    };

    const oldBackup = {
      ...mockAvailableBackups[1],
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    };

    render(
      <EmergencyRecovery
        availableBackups={[recentBackup, oldBackup]}
        affectedWeddings={mockAffectedWeddings}
        emergencyContext={mockEmergencyContext}
        onInitiateRecovery={mockOnInitiateRecovery}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });
});
