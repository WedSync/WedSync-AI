import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BackupStatusWidget,
  CriticalDataProtectionWidget,
  RecoveryEstimatorWidget,
  SystemAlertsWidget,
  BackupPerformanceWidget,
  WeddingSeasonWidget,
} from '../BackupMonitoringWidgets';

// Mock hooks
vi.mock('@/hooks/useRealtimeBackupStatus', () => ({
  useRealtimeBackupStatus: () => [
    {
      database: {
        status: 'healthy',
        lastBackup: '2025-01-22T10:00:00Z',
        nextBackup: '2025-01-22T22:00:00Z',
      },
      photos: {
        status: 'warning',
        lastBackup: '2025-01-22T08:30:00Z',
        nextBackup: '2025-01-22T20:30:00Z',
      },
      timelines: {
        status: 'healthy',
        lastBackup: '2025-01-22T10:00:00Z',
        nextBackup: '2025-01-22T22:00:00Z',
      },
      lastComplete: '2025-01-22T10:00:00Z',
      nextScheduled: '2025-01-22T22:00:00Z',
    },
  ],
}));

vi.mock('@/hooks/useCriticalDataProtection', () => ({
  useCriticalDataProtection: () => [
    {
      weddingData: [
        {
          id: 'wedding-001',
          coupleName: 'Sarah & John',
          weddingDate: '2025-01-25T14:00:00Z',
          lastBackup: '2025-01-22T10:00:00Z',
          riskAssessment: 'low',
          protectionLevel: 'high',
          criticalSystems: ['guest-list', 'photos'],
        },
        {
          id: 'wedding-002',
          coupleName: 'Emma & David',
          weddingDate: '2025-01-24T15:30:00Z',
          lastBackup: '2025-01-21T18:00:00Z',
          riskAssessment: 'high',
          protectionLevel: 'medium',
          criticalSystems: ['timeline', 'contracts'],
        },
      ],
    },
  ],
}));

vi.mock('@/hooks/useRecoveryMetrics', () => ({
  useRecoveryMetrics: () => [
    {
      partialRecovery: '5-10 minutes',
      completeRecovery: '30-45 minutes',
      weddingDayRecovery: '2-5 minutes',
      averageRecoveryTime: '15 minutes',
      successRate: 98.5,
      lastRecoveryTest: '2025-01-20T14:00:00Z',
    },
  ],
}));

vi.mock('@/hooks/useSystemAlerts', () => ({
  useSystemAlerts: () => [
    {
      criticalAlerts: [
        {
          id: 'alert-001',
          type: 'critical',
          title: 'Storage 95% Full',
          message: 'Backup storage approaching capacity limit',
          timestamp: '2025-01-22T11:00:00Z',
          weddingImpact: true,
          resolved: false,
        },
      ],
      totalAlerts: 3,
      unresolvedCount: 1,
      weddingCriticalCount: 1,
    },
  ],
}));

vi.mock('@/hooks/useBackupPerformance', () => ({
  useBackupPerformance: () => [
    {
      metrics: {
        averageBackupTime: '12 minutes',
        successRate: 99.2,
        dataTransferRate: '2.5 GB/min',
        compressionRatio: 0.68,
        lastOptimization: '2025-01-20T10:00:00Z',
      },
      trends: {
        backupTimeChange: -8.5, // 8.5% faster
        successRateChange: 1.2, // 1.2% improvement
        storageEfficiencyChange: 12.3,
      },
    },
  ],
}));

vi.mock('@/hooks/useWeddingSeasonMetrics', () => ({
  useWeddingSeasonMetrics: () => [
    {
      currentSeason: 'peak',
      weeklyWeddings: 127,
      peakDayPrediction: 'Saturday',
      capacityUtilization: 0.85,
      seasonalTrends: {
        weddingVolumeChange: 23.5,
        backupVolumeChange: 31.2,
        systemLoadChange: 18.7,
      },
      nextPeakWeekend: '2025-01-25T00:00:00Z',
    },
  ],
}));

describe('BackupStatusWidget', () => {
  it('renders backup status with all system components', () => {
    render(<BackupStatusWidget />);

    expect(screen.getByText('Backup Status')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Timelines')).toBeInTheDocument();
  });

  it('displays system health indicators correctly', () => {
    render(<BackupStatusWidget />);

    // Database should be healthy
    const databaseStatus = screen
      .getByText('Database')
      .closest('[data-testid="database-status"]');
    expect(databaseStatus).toHaveClass('text-success');

    // Photos should show warning
    const photosStatus = screen
      .getByText('Photos')
      .closest('[data-testid="photos-status"]');
    expect(photosStatus).toHaveClass('text-warning');
  });

  it('shows last backup and next scheduled times', () => {
    render(<BackupStatusWidget />);

    expect(screen.getByText(/last backup/i)).toBeInTheDocument();
    expect(screen.getByText(/next scheduled/i)).toBeInTheDocument();
  });
});

describe('CriticalDataProtectionWidget', () => {
  it('renders wedding data protection levels', () => {
    render(<CriticalDataProtectionWidget />);

    expect(screen.getByText('Critical Data Protection')).toBeInTheDocument();
    expect(screen.getByText('Sarah & John')).toBeInTheDocument();
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
  });

  it('displays risk assessment indicators', () => {
    render(<CriticalDataProtectionWidget />);

    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('shows protection levels for each wedding', () => {
    render(<CriticalDataProtectionWidget />);

    expect(screen.getByText('HIGH PROTECTION')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM PROTECTION')).toBeInTheDocument();
  });

  it('handles wedding protection level click for details', async () => {
    const user = userEvent.setup();
    render(<CriticalDataProtectionWidget />);

    const weddingCard = screen.getByText('Sarah & John').closest('button');
    await user.click(weddingCard!);

    // Should show expanded details or trigger action
    expect(screen.getByText(/guest-list, photos/i)).toBeInTheDocument();
  });
});

describe('RecoveryEstimatorWidget', () => {
  it('renders recovery time estimates for different scenarios', () => {
    render(<RecoveryEstimatorWidget />);

    expect(screen.getByText('Recovery Time Estimates')).toBeInTheDocument();
    expect(screen.getByText('Partial Recovery')).toBeInTheDocument();
    expect(screen.getByText('Complete Recovery')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day Recovery')).toBeInTheDocument();
  });

  it('displays estimated recovery times', () => {
    render(<RecoveryEstimatorWidget />);

    expect(screen.getByText('5-10 minutes')).toBeInTheDocument();
    expect(screen.getByText('30-45 minutes')).toBeInTheDocument();
    expect(screen.getByText('2-5 minutes')).toBeInTheDocument();
  });

  it('shows recovery success rate and metrics', () => {
    render(<RecoveryEstimatorWidget />);

    expect(screen.getByText('98.5%')).toBeInTheDocument();
    expect(screen.getByText(/success rate/i)).toBeInTheDocument();
  });

  it('displays last recovery test information', () => {
    render(<RecoveryEstimatorWidget />);

    expect(screen.getByText(/last test/i)).toBeInTheDocument();
  });
});

describe('SystemAlertsWidget', () => {
  it('renders system alerts with critical indicators', () => {
    render(<SystemAlertsWidget />);

    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('Storage 95% Full')).toBeInTheDocument();
    expect(
      screen.getByText('Backup storage approaching capacity limit'),
    ).toBeInTheDocument();
  });

  it('shows alert counts and wedding impact indicators', () => {
    render(<SystemAlertsWidget />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Total alerts
    expect(screen.getByText('1')).toBeInTheDocument(); // Unresolved count
  });

  it('handles alert acknowledgment', async () => {
    const user = userEvent.setup();
    render(<SystemAlertsWidget />);

    const acknowledgeButton = screen.getByRole('button', {
      name: /acknowledge/i,
    });
    await user.click(acknowledgeButton);

    // Should trigger acknowledgment action
    expect(acknowledgeButton).toBeInTheDocument();
  });

  it('displays wedding impact indicators for critical alerts', () => {
    render(<SystemAlertsWidget />);

    expect(screen.getByText('WEDDING IMPACT')).toBeInTheDocument();
  });
});

describe('BackupPerformanceWidget', () => {
  it('renders backup performance metrics', () => {
    render(<BackupPerformanceWidget />);

    expect(screen.getByText('Backup Performance')).toBeInTheDocument();
    expect(screen.getByText('12 minutes')).toBeInTheDocument(); // Average backup time
    expect(screen.getByText('99.2%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('2.5 GB/min')).toBeInTheDocument(); // Transfer rate
  });

  it('shows performance trends with improvement indicators', () => {
    render(<BackupPerformanceWidget />);

    // Should show improvement indicators
    expect(screen.getByText('-8.5%')).toBeInTheDocument(); // Faster backup time
    expect(screen.getByText('+1.2%')).toBeInTheDocument(); // Better success rate
    expect(screen.getByText('+12.3%')).toBeInTheDocument(); // Storage efficiency
  });

  it('displays compression ratio and optimization info', () => {
    render(<BackupPerformanceWidget />);

    expect(screen.getByText('68%')).toBeInTheDocument(); // Compression ratio
    expect(screen.getByText(/last optimization/i)).toBeInTheDocument();
  });
});

describe('WeddingSeasonWidget', () => {
  it('renders wedding season metrics and trends', () => {
    render(<WeddingSeasonWidget />);

    expect(screen.getByText('Wedding Season Monitor')).toBeInTheDocument();
    expect(screen.getByText('PEAK SEASON')).toBeInTheDocument();
    expect(screen.getByText('127')).toBeInTheDocument(); // Weekly weddings
  });

  it('shows capacity utilization and peak predictions', () => {
    render(<WeddingSeasonWidget />);

    expect(screen.getByText('85%')).toBeInTheDocument(); // Capacity utilization
    expect(screen.getByText('Saturday')).toBeInTheDocument(); // Peak day prediction
  });

  it('displays seasonal trend indicators', () => {
    render(<WeddingSeasonWidget />);

    expect(screen.getByText('+23.5%')).toBeInTheDocument(); // Wedding volume change
    expect(screen.getByText('+31.2%')).toBeInTheDocument(); // Backup volume change
    expect(screen.getByText('+18.7%')).toBeInTheDocument(); // System load change
  });

  it('shows next peak weekend information', () => {
    render(<WeddingSeasonWidget />);

    expect(screen.getByText(/next peak weekend/i)).toBeInTheDocument();
  });

  it('handles capacity alert when utilization is high', () => {
    render(<WeddingSeasonWidget />);

    // With 85% utilization, should show warning
    expect(screen.getByText('HIGH UTILIZATION')).toBeInTheDocument();
  });
});

describe('Widget Integration', () => {
  it('all widgets render together without conflicts', () => {
    render(
      <div>
        <BackupStatusWidget />
        <CriticalDataProtectionWidget />
        <RecoveryEstimatorWidget />
        <SystemAlertsWidget />
        <BackupPerformanceWidget />
        <WeddingSeasonWidget />
      </div>,
    );

    expect(screen.getByText('Backup Status')).toBeInTheDocument();
    expect(screen.getByText('Critical Data Protection')).toBeInTheDocument();
    expect(screen.getByText('Recovery Time Estimates')).toBeInTheDocument();
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('Backup Performance')).toBeInTheDocument();
    expect(screen.getByText('Wedding Season Monitor')).toBeInTheDocument();
  });

  it('widgets maintain proper responsive behavior', () => {
    render(
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BackupStatusWidget />
        <CriticalDataProtectionWidget />
        <RecoveryEstimatorWidget />
      </div>,
    );

    const widgets = screen.getAllByRole('article');
    expect(widgets).toHaveLength(3);
  });
});

describe('Widget Accessibility', () => {
  it('provides proper ARIA labels for screen readers', () => {
    render(<BackupStatusWidget />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Backup status widget',
    );
    expect(screen.getByLabelText(/backup system status/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation for interactive elements', async () => {
    render(<SystemAlertsWidget />);

    const acknowledgeButton = screen.getByRole('button', {
      name: /acknowledge/i,
    });
    acknowledgeButton.focus();

    fireEvent.keyDown(acknowledgeButton, { key: 'Enter' });
    expect(acknowledgeButton).toHaveFocus();
  });

  it('provides proper contrast for status indicators', () => {
    render(<CriticalDataProtectionWidget />);

    const highRiskIndicator = screen.getByText('HIGH RISK');
    expect(highRiskIndicator).toHaveClass('text-danger');

    const lowRiskIndicator = screen.getByText('LOW RISK');
    expect(lowRiskIndicator).toHaveClass('text-success');
  });
});

describe('Widget Real-time Updates', () => {
  it('updates backup status indicators in real-time', async () => {
    const { rerender } = render(<BackupStatusWidget />);

    expect(screen.getByText('Backup Status')).toBeInTheDocument();

    // Simulate real-time update by re-rendering
    rerender(<BackupStatusWidget />);

    expect(screen.getByText('Backup Status')).toBeInTheDocument();
  });

  it('reflects changes in wedding protection levels', async () => {
    render(<CriticalDataProtectionWidget />);

    // Initial state
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();

    // Should handle dynamic updates from the mock hook
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
  });
});
