import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataRecoveryPreview from '../DataRecoveryPreview';

// Mock data for testing
const mockBackupSnapshot = {
  id: 'backup-snapshot-001',
  timestamp: '2025-01-22T10:00:00Z',
  size: '2.1 GB',
  version: '1.5.2',
  affectedWeddings: [
    {
      id: 'wedding-001',
      coupleName: 'Sarah & John',
      weddingDate: '2025-01-25T14:00:00Z',
      venue: 'Grand Hotel Ballroom',
      status: 'upcoming' as const,
      daysUntilWedding: 3,
    },
    {
      id: 'wedding-002',
      coupleName: 'Emma & David',
      weddingDate: '2025-01-24T15:30:00Z',
      venue: 'Garden Estate',
      status: 'upcoming' as const,
      daysUntilWedding: 2,
    },
  ],
  guestLists: [
    {
      weddingId: 'wedding-001',
      guestCount: 150,
      lastModified: '2025-01-22T09:30:00Z',
      rsvpStatus: 'complete' as const,
    },
    {
      weddingId: 'wedding-002',
      guestCount: 85,
      lastModified: '2025-01-22T08:15:00Z',
      rsvpStatus: 'partial' as const,
    },
  ],
  timelines: [
    {
      weddingId: 'wedding-001',
      eventCount: 25,
      lastModified: '2025-01-22T09:45:00Z',
      criticalEvents: ['Ceremony', 'Reception', 'First Dance'],
    },
  ],
  photos: [
    {
      weddingId: 'wedding-001',
      photoCount: 450,
      totalSize: '850 MB',
      galleries: ['Engagement', 'Pre-Wedding', 'Ceremony'],
    },
  ],
  forms: [
    {
      weddingId: 'wedding-001',
      formCount: 8,
      submissionCount: 127,
      lastModified: '2025-01-22T09:20:00Z',
    },
  ],
  vendors: [
    {
      weddingId: 'wedding-001',
      vendorCount: 12,
      contracts: 8,
      lastModified: '2025-01-22T09:35:00Z',
    },
  ],
  contracts: [
    {
      weddingId: 'wedding-001',
      contractCount: 8,
      signedCount: 6,
      pendingCount: 2,
    },
  ],
  metadata: {
    createdBy: 'system-admin',
    backupType: 'scheduled' as const,
    dataIntegrityScore: 98.5,
    encryptionStatus: 'encrypted' as const,
  },
};

describe('DataRecoveryPreview', () => {
  const mockOnSelectiveRestore = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders data recovery preview with backup metadata', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Data Recovery Preview')).toBeInTheDocument();
    expect(screen.getByText('2.1 GB')).toBeInTheDocument();
    expect(screen.getByText('encrypted')).toBeInTheDocument();
    expect(screen.getByText('2 affected')).toBeInTheDocument();
  });

  it('displays affected weddings with urgency indicators', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Sarah & John')).toBeInTheDocument();
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
    expect(screen.getByText('Grand Hotel Ballroom')).toBeInTheDocument();
    expect(screen.getByText('Garden Estate')).toBeInTheDocument();
  });

  it('shows data type selection with statistics', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Guest lists')).toBeInTheDocument();
    expect(screen.getByText('Timelines')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Forms')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Contracts')).toBeInTheDocument();

    // Check statistics
    expect(
      screen.getByText('235 guests across 2 weddings'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('25 events across 1 timelines'),
    ).toBeInTheDocument();
    expect(screen.getByText('450 photos (850 MB)')).toBeInTheDocument();
  });

  it('handles data type selection and deselection', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select guest lists
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    // Select timelines
    const timelinesOption = screen
      .getByText('Timelines')
      .closest('[data-testid="data-type-option"]');
    await user.click(timelinesOption!);

    expect(screen.getByText('2 data types selected')).toBeInTheDocument();
  });

  it('shows conflict detection when data types are selected', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
        currentSystemState={{ hasConflicts: true }}
      />,
    );

    // Select guest lists to trigger conflict detection
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    await waitFor(() => {
      expect(screen.getByText('Data Conflicts Detected')).toBeInTheDocument();
    });
  });

  it('displays recovery impact assessment', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select data types to trigger impact assessment
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    await waitFor(() => {
      expect(
        screen.getByText('Recovery Impact Assessment'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Duration/)).toBeInTheDocument();
      expect(screen.getByText(/Data Loss Risk/)).toBeInTheDocument();
      expect(screen.getByText(/Affected Users/)).toBeInTheDocument();
    });
  });

  it('shows recovery options when data types are selected', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    await waitFor(() => {
      expect(screen.getByText('Recovery Options')).toBeInTheDocument();
      expect(
        screen.getByText('Create backup before restore (recommended)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Overwrite existing data (resolves all conflicts)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Notify affected users of data recovery'),
      ).toBeInTheDocument();
    });
  });

  it('handles selective restore initiation', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select data types
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    const photosOption = screen
      .getByText('Photos')
      .closest('[data-testid="data-type-option"]');
    await user.click(photosOption!);

    // Start recovery
    const startRecoveryButton = screen.getByText('Start Recovery');
    await user.click(startRecoveryButton);

    expect(mockOnSelectiveRestore).toHaveBeenCalledWith(
      ['guest-lists', 'photos'],
      expect.objectContaining({
        createBackupBeforeRestore: true,
        overwriteExisting: false,
        notifyAffectedUsers: true,
        validateDataIntegrity: true,
      }),
    );
  });

  it('disables start recovery button when no data types selected', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    const startRecoveryButton = screen.getByText('Start Recovery');
    expect(startRecoveryButton).toBeDisabled();
  });

  it('handles recovery cancellation', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getByText('Cancel Recovery');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows emergency mode styling when in emergency mode', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
        emergencyMode={true}
      />,
    );

    const emergencyButton = screen.getByText('Emergency Restore');
    expect(emergencyButton).toHaveClass('bg-danger');
  });

  it('displays backup age calculation correctly', () => {
    // Mock backup from 2 hours ago
    const recentBackup = {
      ...mockBackupSnapshot,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };

    render(
      <DataRecoveryPreview
        backupSnapshot={recentBackup}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it('shows conflict details when expanded', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
        currentSystemState={{ hasConflicts: true }}
      />,
    );

    // Select data type to trigger conflicts
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    await waitFor(() => {
      expect(screen.getByText('Data Conflicts Detected')).toBeInTheDocument();
    });

    // Expand conflict details
    const viewDetailsButton = screen.getByText('View Details');
    await user.click(viewDetailsButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Guest list for Sarah & John wedding has 12 new RSVPs since backup',
        ),
      ).toBeInTheDocument();
    });
  });

  it('calculates recovery time estimates based on selection', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select only guest lists (should be faster)
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    await waitFor(() => {
      expect(screen.getByText('5-10 minutes')).toBeInTheDocument();
    });

    // Select more data types (should be slower)
    const photosOption = screen
      .getByText('Photos')
      .closest('[data-testid="data-type-option"]');
    await user.click(photosOption!);

    const timelinesOption = screen
      .getByText('Timelines')
      .closest('[data-testid="data-type-option"]');
    await user.click(timelinesOption!);

    await waitFor(() => {
      expect(screen.getByText('15-30 minutes')).toBeInTheDocument();
    });
  });

  it('handles recovery options configuration', async () => {
    const user = userEvent.setup();

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select data type
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    // Toggle overwrite existing data option
    const overwriteCheckbox = screen.getByLabelText(
      'Overwrite existing data (resolves all conflicts)',
    );
    await user.click(overwriteCheckbox);

    // Start recovery
    const startRecoveryButton = screen.getByText('Start Recovery');
    await user.click(startRecoveryButton);

    expect(mockOnSelectiveRestore).toHaveBeenCalledWith(
      ['guest-lists'],
      expect.objectContaining({
        overwriteExisting: true,
      }),
    );
  });

  it('shows recovery failure error message', async () => {
    const user = userEvent.setup();
    const failingRestore = vi
      .fn()
      .mockRejectedValue(new Error('Network timeout during restore'));

    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={failingRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Select data type and start recovery
    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    await user.click(guestListOption!);

    const startRecoveryButton = screen.getByText('Start Recovery');
    await user.click(startRecoveryButton);

    await waitFor(() => {
      expect(
        screen.getByText('Network timeout during restore'),
      ).toBeInTheDocument();
    });
  });

  it('provides accessible navigation and ARIA support', () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    expect(
      screen.getByLabelText(/data recovery preview interface/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Check for proper form elements
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('handles keyboard navigation for data selection', async () => {
    render(
      <DataRecoveryPreview
        backupSnapshot={mockBackupSnapshot}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    const guestListOption = screen
      .getByText('Guest lists')
      .closest('[data-testid="data-type-option"]');
    guestListOption!.focus();

    fireEvent.keyDown(guestListOption!, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('1 data type selected')).toBeInTheDocument();
    });
  });

  it('shows wedding-specific risk indicators for urgent weddings', () => {
    const urgentWeddingBackup = {
      ...mockBackupSnapshot,
      affectedWeddings: [
        {
          id: 'wedding-urgent',
          coupleName: 'Lisa & Mark',
          weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          venue: 'City Chapel',
          status: 'upcoming' as const,
          daysUntilWedding: 1,
        },
      ],
    };

    render(
      <DataRecoveryPreview
        backupSnapshot={urgentWeddingBackup}
        onSelectiveRestore={mockOnSelectiveRestore}
        onCancel={mockOnCancel}
      />,
    );

    // Wedding tomorrow should show urgent styling
    const weddingCard = screen
      .getByText('Lisa & Mark')
      .closest('[data-testid="wedding-card"]');
    expect(weddingCard).toHaveClass('border-danger');
  });
});
