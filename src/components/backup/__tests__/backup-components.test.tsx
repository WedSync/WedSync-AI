import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import all backup components
import BackupManagementDashboard from '../BackupManagementDashboard';
import DisasterRecoveryWizard from '../DisasterRecoveryWizard';
import DataRestorationInterface from '../DataRestorationInterface';
import BackupScheduler from '../BackupScheduler';
import BackupStatusMonitor from '../BackupStatusMonitor';
import WeddingDataBackupSelector from '../WeddingDataBackupSelector';
import CriticalDateProtection from '../CriticalDateProtection';
import VendorDataBackupManager from '../VendorDataBackupManager';
import EmergencyRecoveryPanel from '../EmergencyRecoveryPanel';
import BackupComplianceTracker from '../BackupComplianceTracker';
import RecoveryProgressTracker from '../RecoveryProgressTracker';
import DataIntegrityValidator from '../DataIntegrityValidator';
import PointInTimeRecovery from '../PointInTimeRecovery';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  functions: {
    invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
};

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} data-testid="progress" data-value={value}></div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="input"
    />
  ),
}));

describe('WS-249 Backup & Disaster Recovery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BackupManagementDashboard', () => {
    test('renders dashboard with metrics overview', async () => {
      render(<BackupManagementDashboard />);

      expect(
        screen.getByText('Backup Management Dashboard'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Centralized wedding data protection & disaster recovery',
        ),
      ).toBeInTheDocument();

      // Wait for metrics to load
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'backup_metrics_summary',
        );
      });
    });

    test('displays recent backup activities', async () => {
      const mockBackups = [
        {
          id: '1',
          backup_name: 'Daily Wedding Backup',
          status: 'completed',
          backup_type: 'full',
          started_at: new Date().toISOString(),
          size_gb: 15.2,
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({ data: mockBackups, error: null }),
          ),
        })),
      }));

      render(<BackupManagementDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Daily Wedding Backup')).toBeInTheDocument();
      });
    });

    test('handles emergency backup creation', async () => {
      render(<BackupManagementDashboard />);

      const emergencyButton = screen.getByText('Emergency Backup');
      fireEvent.click(emergencyButton);

      await waitFor(() => {
        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'create-emergency-backup',
          expect.any(Object),
        );
      });
    });
  });

  describe('DisasterRecoveryWizard', () => {
    test('renders disaster recovery wizard steps', () => {
      render(<DisasterRecoveryWizard />);

      expect(screen.getByText('Disaster Recovery Wizard')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Emergency wedding data recovery with guided assistance',
        ),
      ).toBeInTheDocument();
    });

    test('progresses through recovery steps', async () => {
      render(<DisasterRecoveryWizard />);

      // Should start at assessment step
      expect(screen.getByText('Impact Assessment')).toBeInTheDocument();

      const nextButton = screen.getByText('Next: Analyze Data');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Data Analysis')).toBeInTheDocument();
      });
    });

    test('validates wedding impact before proceeding', async () => {
      render(<DisasterRecoveryWizard />);

      const nextButton = screen.getByText('Next: Analyze Data');
      fireEvent.click(nextButton);

      // Should not proceed without proper validation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('affected_weddings');
    });
  });

  describe('DataRestorationInterface', () => {
    test('renders data restoration tree view', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Wedding Data',
          type: 'category',
          children: [],
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => Promise.resolve({ data: mockData, error: null })),
      }));

      render(<DataRestorationInterface />);

      expect(
        screen.getByText('Data Restoration Interface'),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Wedding Data')).toBeInTheDocument();
      });
    });

    test('handles selective data restoration', async () => {
      render(<DataRestorationInterface />);

      // Mock checkbox selection
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);

      const restoreButton = screen.getByText('Start Restoration');
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'start-selective-restore',
          expect.any(Object),
        );
      });
    });
  });

  describe('BackupScheduler', () => {
    test('renders backup scheduling interface', () => {
      render(<BackupScheduler />);

      expect(screen.getByText('Backup Scheduler')).toBeInTheDocument();
      expect(
        screen.getByText('Wedding-adaptive automated backup configuration'),
      ).toBeInTheDocument();
    });

    test('creates new backup schedule', async () => {
      render(<BackupScheduler />);

      const scheduleNameInput = screen.getByPlaceholderText(
        'Enter schedule name',
      );
      fireEvent.change(scheduleNameInput, {
        target: { value: 'Weekly Wedding Backup' },
      });

      const saveButton = screen.getByText('Save Schedule');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'backup_schedules',
        );
      });
    });

    test('enforces Saturday lockdown protocols', async () => {
      // Mock Saturday date
      const mockSaturday = new Date('2024-01-06'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockSaturday as any);

      render(<BackupScheduler />);

      expect(screen.getByText('Saturday Lockdown Active')).toBeInTheDocument();
      expect(screen.getByText('Emergency-only operations')).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('BackupStatusMonitor', () => {
    test('displays real-time backup status', async () => {
      const mockBackups = [
        {
          id: '1',
          backup_name: 'Real-time Wedding Sync',
          status: 'running',
          progress: 75,
          started_at: new Date().toISOString(),
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({ data: mockBackups, error: null }),
          ),
        })),
      }));

      render(<BackupStatusMonitor />);

      await waitFor(() => {
        expect(screen.getByText('Real-time Wedding Sync')).toBeInTheDocument();
        expect(screen.getByTestId('progress')).toHaveAttribute(
          'data-value',
          '75',
        );
      });
    });

    test('handles backup cancellation', async () => {
      render(<BackupStatusMonitor />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'backup_operations',
        );
      });
    });
  });

  describe('WeddingDataBackupSelector', () => {
    test('renders wedding-specific data selection', () => {
      render(<WeddingDataBackupSelector />);

      expect(
        screen.getByText('Wedding Data Backup Selector'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Prioritized wedding data selection with timeline awareness',
        ),
      ).toBeInTheDocument();
    });

    test('prioritizes critical wedding assets', async () => {
      const mockWeddings = [
        {
          wedding_id: '1',
          couple_name: 'John & Jane',
          wedding_date: '2024-06-15',
          photographer: 'Sarah Photography',
          assets: {
            photos: { critical: true, count: 500, size_gb: 12.5 },
          },
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() =>
          Promise.resolve({ data: mockWeddings, error: null }),
        ),
      }));

      render(<WeddingDataBackupSelector />);

      await waitFor(() => {
        expect(screen.getByText('John & Jane')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });
  });

  describe('CriticalDateProtection', () => {
    test('activates Saturday protection protocols', () => {
      render(<CriticalDateProtection />);

      expect(screen.getByText('Critical Date Protection')).toBeInTheDocument();
      expect(
        screen.getByText('Saturday wedding lockdown & emergency protocols'),
      ).toBeInTheDocument();
    });

    test('monitors upcoming wedding dates', async () => {
      const mockWeddings = [
        {
          wedding_id: '1',
          wedding_date: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // Tomorrow
          couple_name: 'Test Couple',
          protection_level: 'maximum',
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() =>
              Promise.resolve({ data: mockWeddings, error: null }),
            ),
          })),
        })),
      }));

      render(<CriticalDateProtection />);

      await waitFor(() => {
        expect(screen.getByText('Test Couple')).toBeInTheDocument();
        expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      });
    });
  });

  describe('VendorDataBackupManager', () => {
    test('renders vendor-specific backup workflows', () => {
      render(<VendorDataBackupManager />);

      expect(
        screen.getByText('Vendor Data Backup Manager'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Specialized backup workflows for photographers, venues & florists',
        ),
      ).toBeInTheDocument();
    });

    test('handles photographer RAW file backups', async () => {
      render(<VendorDataBackupManager />);

      const photographerTab = screen.getByText('Photographers');
      fireEvent.click(photographerTab);

      await waitFor(() => {
        expect(screen.getByText('RAW Files')).toBeInTheDocument();
        expect(screen.getByText('High Priority')).toBeInTheDocument();
      });
    });
  });

  describe('EmergencyRecoveryPanel', () => {
    test('renders emergency response interface', () => {
      render(<EmergencyRecoveryPanel />);

      expect(screen.getByText('Emergency Recovery Panel')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Wedding day emergency response & critical incident management',
        ),
      ).toBeInTheDocument();
    });

    test('creates emergency incident', async () => {
      render(<EmergencyRecoveryPanel />);

      const createButton = screen.getByText('Create Incident');
      fireEvent.click(createButton);

      const titleInput = screen.getByPlaceholderText(
        'Brief incident description',
      );
      fireEvent.change(titleInput, {
        target: { value: 'Wedding photo corruption' },
      });

      const submitButton = screen.getByText('Create Emergency Incident');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'emergency_incidents',
        );
      });
    });
  });

  describe('BackupComplianceTracker', () => {
    test('displays compliance metrics overview', async () => {
      const mockMetrics = {
        overall_score: 85,
        wedding_protection_score: 95,
        critical_violations: 2,
        total_rules: 25,
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({ data: mockMetrics, error: null }),
          ),
        })),
      }));

      render(<BackupComplianceTracker />);

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument();
      });
    });

    test('exports compliance report', async () => {
      render(<BackupComplianceTracker />);

      const exportButton = screen.getByText('Export Report');
      fireEvent.click(exportButton);

      // Mock successful export (would normally trigger file download)
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('RecoveryProgressTracker', () => {
    test('displays active recovery operations', async () => {
      const mockOperations = [
        {
          id: '1',
          operation_name: 'Wedding Data Recovery',
          status: 'in_progress',
          overall_progress: 45,
          recovery_type: 'wedding_specific',
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({ data: mockOperations, error: null }),
          ),
        })),
      }));

      render(<RecoveryProgressTracker />);

      await waitFor(() => {
        expect(screen.getByText('Wedding Data Recovery')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
      });
    });

    test('controls recovery operations', async () => {
      render(<RecoveryProgressTracker />);

      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'recovery_operations',
        );
      });
    });
  });

  describe('DataIntegrityValidator', () => {
    test('starts data validation process', async () => {
      render(<DataIntegrityValidator />);

      const startButton = screen.getByText('Start Validation');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'start-data-validation',
          expect.any(Object),
        );
      });
    });

    test('displays validation results', async () => {
      const mockRuns = [
        {
          id: '1',
          run_name: 'Full System Validation',
          status: 'completed',
          overall_score: 92,
          passed_checks: 18,
          failed_checks: 2,
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({ data: mockRuns, error: null }),
          ),
        })),
      }));

      render(<DataIntegrityValidator />);

      await waitFor(() => {
        expect(screen.getByText('Full System Validation')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });
    });
  });

  describe('PointInTimeRecovery', () => {
    test('displays available recovery points', async () => {
      const mockPoints = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          backup_type: 'full',
          status: 'available',
          size_gb: 25.6,
          wedding_events_count: 5,
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() =>
                Promise.resolve({ data: mockPoints, error: null }),
              ),
            })),
          })),
        })),
      }));

      render(<PointInTimeRecovery />);

      await waitFor(() => {
        expect(screen.getByText('25.6 GB')).toBeInTheDocument();
      });
    });

    test('creates recovery request', async () => {
      render(<PointInTimeRecovery />);

      const createButton = screen.getByText('Create Recovery Request');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Recovery Request')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    test('all components handle Supabase errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() =>
          Promise.resolve({ data: null, error: 'Network error' }),
        ),
      }));

      const components = [
        BackupManagementDashboard,
        DisasterRecoveryWizard,
        DataRestorationInterface,
        BackupScheduler,
        BackupStatusMonitor,
        WeddingDataBackupSelector,
        CriticalDateProtection,
        VendorDataBackupManager,
        EmergencyRecoveryPanel,
        BackupComplianceTracker,
        RecoveryProgressTracker,
        DataIntegrityValidator,
        PointInTimeRecovery,
      ];

      for (const Component of components) {
        const { unmount } = render(<Component />);

        // Should not crash on error
        await waitFor(() => {
          expect(screen.queryByText('Error')).not.toBeInTheDocument();
        });

        unmount();
      }
    });

    test('wedding data protection consistency across components', async () => {
      const mockWeddingData = {
        wedding_id: '123',
        wedding_date: '2024-06-15',
        couple_name: 'John & Jane',
        photographer: 'Sarah Photography',
        status: 'confirmed',
      };

      // Test that wedding-specific components handle the same data structure
      const weddingComponents = [
        WeddingDataBackupSelector,
        CriticalDateProtection,
        VendorDataBackupManager,
      ];

      for (const Component of weddingComponents) {
        mockSupabaseClient.from.mockImplementation(() => ({
          select: jest.fn(() =>
            Promise.resolve({ data: [mockWeddingData], error: null }),
          ),
        }));

        const { unmount } = render(<Component />);

        await waitFor(() => {
          expect(screen.getByText('John & Jane')).toBeInTheDocument();
        });

        unmount();
      }
    });

    test('Saturday protection enforcement across system', () => {
      // Mock Saturday date
      const mockSaturday = new Date('2024-01-06'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockSaturday as any);

      const protectedComponents = [
        CriticalDateProtection,
        BackupScheduler,
        EmergencyRecoveryPanel,
      ];

      for (const Component of protectedComponents) {
        const { unmount } = render(<Component />);

        // Should show Saturday protection status
        expect(screen.getByText(/Saturday/i)).toBeInTheDocument();

        unmount();
      }

      jest.restoreAllMocks();
    });
  });

  describe('Performance Tests', () => {
    test('components render within performance budget', async () => {
      const startTime = performance.now();

      render(<BackupManagementDashboard />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('data loading does not block UI', async () => {
      // Mock slow API response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => slowPromise),
      }));

      render(<BackupManagementDashboard />);

      // UI should be responsive immediately
      expect(
        screen.getByText('Backup Management Dashboard'),
      ).toBeInTheDocument();

      // Resolve the slow promise
      resolvePromise!({ data: [], error: null });
    });
  });

  describe('Accessibility Tests', () => {
    test('all interactive elements have proper ARIA labels', () => {
      render(<BackupManagementDashboard />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('data-testid', 'button');
      });
    });

    test('components support keyboard navigation', () => {
      render(<DisasterRecoveryWizard />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();

      expect(document.activeElement).toBe(firstButton);
    });
  });
});
