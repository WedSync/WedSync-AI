import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BackupDashboard from '../BackupDashboard';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClientComponentClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
  }),
}));

// Mock data for testing
const mockSystemHealth = {
  overallStatus: 'healthy' as const,
  lastBackup: '2025-01-22T10:00:00Z',
  nextScheduled: '2025-01-22T22:00:00Z',
  backupSuccess: true,
  storageUsed: '45.2 GB',
  storageLimit: '100 GB',
  replicationStatus: 'active' as const,
  alerts: [],
};

const mockRecentBackups = [
  {
    id: 'backup-001',
    timestamp: '2025-01-22T10:00:00Z',
    type: 'scheduled',
    status: 'completed',
    size: '2.1 GB',
    weddingCount: 15,
    duration: '12m 34s',
    dataTypes: ['guest-lists', 'photos', 'timelines'],
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
  },
];

const mockWeddingCriticalData = [
  {
    weddingId: 'wedding-001',
    coupleName: 'Sarah & John',
    weddingDate: '2025-01-25T14:00:00Z',
    daysUntil: 3,
    lastBackup: '2025-01-22T10:00:00Z',
    backupStatus: 'recent',
    criticalSystems: ['guest-list', 'timeline', 'photos'],
    riskLevel: 'low',
  },
  {
    weddingId: 'wedding-002',
    coupleName: 'Emma & David',
    weddingDate: '2025-01-24T15:30:00Z',
    daysUntil: 2,
    lastBackup: '2025-01-21T18:00:00Z',
    backupStatus: 'overdue',
    criticalSystems: ['guest-list', 'contracts'],
    riskLevel: 'high',
  },
];

describe('BackupDashboard', () => {
  const mockOnEmergencyRestore = vi.fn();
  const mockOnRefreshData = vi.fn();
  const mockOnScheduleBackup = vi.fn();
  const mockOnForceBackup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders backup dashboard with system health status', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('Backup & Recovery Dashboard')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('45.2 GB')).toBeInTheDocument();
    expect(screen.getByText('100 GB')).toBeInTheDocument();
  });

  it('displays recent backup history correctly', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('2.1 GB')).toBeInTheDocument();
    expect(screen.getByText('1.8 GB')).toBeInTheDocument();
    expect(screen.getByText('12m 34s')).toBeInTheDocument();
    expect(screen.getByText('8m 45s')).toBeInTheDocument();
  });

  it('shows critical wedding data with proper risk indicators', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('Sarah & John')).toBeInTheDocument();
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();

    // Check risk indicators
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('handles emergency restore button click', async () => {
    const user = userEvent.setup();

    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    const emergencyButton = screen.getByText('Emergency Restore');
    await user.click(emergencyButton);

    expect(mockOnEmergencyRestore).toHaveBeenCalledWith(
      mockRecentBackups[0].id,
    );
  });

  it('handles force backup button click', async () => {
    const user = userEvent.setup();

    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    const forceBackupButton = screen.getByText('Force Backup Now');
    await user.click(forceBackupButton);

    expect(mockOnForceBackup).toHaveBeenCalled();
  });

  it('displays critical alerts when system is unhealthy', () => {
    const unhealthySystem = {
      ...mockSystemHealth,
      overallStatus: 'critical' as const,
      backupSuccess: false,
      alerts: [
        {
          id: 'alert-001',
          type: 'critical',
          message: 'Backup storage 95% full',
          timestamp: '2025-01-22T11:00:00Z',
          weddingImpact: true,
        },
      ],
    };

    render(
      <BackupDashboard
        systemHealth={unhealthySystem}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('Backup storage 95% full')).toBeInTheDocument();
  });

  it('shows wedding urgency indicators for imminent weddings', () => {
    const urgentWeddingData = [
      {
        ...mockWeddingCriticalData[0],
        daysUntil: 0, // Wedding is today
        riskLevel: 'critical',
      },
    ];

    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={urgentWeddingData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL RISK')).toBeInTheDocument();
  });

  it('handles refresh data functionality', async () => {
    const user = userEvent.setup();

    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    const refreshButton = screen.getByLabelText('Refresh backup data');
    await user.click(refreshButton);

    expect(mockOnRefreshData).toHaveBeenCalled();
  });

  it('displays backup type indicators correctly', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('MANUAL')).toBeInTheDocument();
  });

  it('shows data types included in each backup', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    expect(
      screen.getByText(/guest-lists, photos, timelines/),
    ).toBeInTheDocument();
    expect(screen.getByText(/guest-lists, forms/)).toBeInTheDocument();
  });

  it('handles real-time updates correctly', async () => {
    const { rerender } = render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    // Simulate real-time update
    const updatedBackups = [
      {
        ...mockRecentBackups[0],
        timestamp: '2025-01-22T12:00:00Z', // Updated timestamp
      },
      ...mockRecentBackups.slice(1),
    ];

    rerender(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={updatedBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    await waitFor(() => {
      expect(mockOnRefreshData).toHaveBeenCalled();
    });
  });

  it('provides accessible navigation and screen reader support', () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    // Check for ARIA labels
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('Backup system status')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent backup history')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Wedding critical data protection'),
    ).toBeInTheDocument();
  });

  it('handles keyboard navigation for emergency actions', async () => {
    render(
      <BackupDashboard
        systemHealth={mockSystemHealth}
        recentBackups={mockRecentBackups}
        weddingCriticalData={mockWeddingCriticalData}
        onEmergencyRestore={mockOnEmergencyRestore}
        onRefreshData={mockOnRefreshData}
        onScheduleBackup={mockOnScheduleBackup}
        onForceBackup={mockOnForceBackup}
      />,
    );

    const emergencyButton = screen.getByText('Emergency Restore');
    emergencyButton.focus();

    fireEvent.keyDown(emergencyButton, { key: 'Enter' });
    expect(mockOnEmergencyRestore).toHaveBeenCalledWith(
      mockRecentBackups[0].id,
    );
  });
});
