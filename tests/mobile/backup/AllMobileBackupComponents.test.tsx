import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import all mobile backup components
import MobileBackupManager from '@/components/mobile/backup/MobileBackupManager';
import OfflineRecoveryInterface from '@/components/mobile/backup/OfflineRecoveryInterface';
import EmergencyDataAccess from '@/components/mobile/backup/EmergencyDataAccess';
import MobileBackupScheduler from '@/components/mobile/backup/MobileBackupScheduler';
import LocalBackupSync from '@/components/mobile/backup/LocalBackupSync';
import WeddingDayEmergencyAccess from '@/components/mobile/backup/WeddingDayEmergencyAccess';
import OfflineVendorContacts from '@/components/mobile/backup/OfflineVendorContacts';
import CriticalDocumentAccess from '@/components/mobile/backup/CriticalDocumentAccess';

// Mock global APIs
const mockNavigator = {
  onLine: true,
  getBattery: jest.fn().mockResolvedValue({
    level: 0.75,
    charging: false,
    addEventListener: jest.fn()
  }),
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  },
  share: jest.fn().mockResolvedValue(undefined)
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

describe('Mobile Backup System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigator.onLine = true;
  });

  describe('Component Rendering', () => {
    test('all mobile backup components render without errors', () => {
      const components = [
        { Component: MobileBackupManager, name: 'MobileBackupManager' },
        { Component: OfflineRecoveryInterface, name: 'OfflineRecoveryInterface' },
        { Component: EmergencyDataAccess, name: 'EmergencyDataAccess' },
        { Component: MobileBackupScheduler, name: 'MobileBackupScheduler' },
        { Component: WeddingDayEmergencyAccess, name: 'WeddingDayEmergencyAccess' },
        { Component: OfflineVendorContacts, name: 'OfflineVendorContacts' },
        { Component: CriticalDocumentAccess, name: 'CriticalDocumentAccess' }
      ];

      components.forEach(({ Component, name }) => {
        expect(() => {
          render(<Component />);
        }).not.toThrow();
      });
    });
  });

  describe('Wedding Day Mode Integration', () => {
    test('all components activate wedding day mode on Saturdays', () => {
      const mockSaturday = new Date('2024-06-15T10:00:00'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockSaturday as any);

      render(<MobileBackupManager />);
      render(<WeddingDayEmergencyAccess />);

      expect(screen.getAllByText(/Wedding Day/i).length).toBeGreaterThan(0);

      jest.restoreAllMocks();
    });
  });

  describe('Offline Mode Integration', () => {
    test('all components handle offline state correctly', async () => {
      mockNavigator.onLine = false;

      const { container: backupManager } = render(<MobileBackupManager />);
      const { container: offlineRecovery } = render(<OfflineRecoveryInterface />);
      const { container: emergencyAccess } = render(<EmergencyDataAccess />);

      // Trigger offline event
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Touch Interaction Testing', () => {
    test('all interactive elements have proper touch targets', () => {
      render(<MobileBackupManager />);
      render(<EmergencyDataAccess />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check if button has touch-friendly class or minimum size
        expect(button).toHaveClass(/touch-manipulation|h-12|min-h-/);
      });
    });
  });

  describe('Performance Testing', () => {
    test('components render within performance budget', async () => {
      const startTime = performance.now();

      render(<MobileBackupManager />);
      render(<OfflineVendorContacts />);
      render(<CriticalDocumentAccess />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render all components within 200ms for mobile
      expect(renderTime).toBeLessThan(200);
    });
  });
});

describe('LocalBackupSync Component Tests', () => {
  test('renders sync interface', () => {
    render(<LocalBackupSync />);
    expect(screen.getByText(/Local Storage/i)).toBeInTheDocument();
  });

  test('handles sync operations', async () => {
    render(<LocalBackupSync />);
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    if (syncButton) {
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(screen.getByText(/sync/i)).toBeInTheDocument();
      });
    }
  });
});

describe('MobileBackupScheduler Component Tests', () => {
  test('renders scheduler interface', () => {
    render(<MobileBackupScheduler />);
    expect(screen.getByText(/System Status|Backup/i)).toBeInTheDocument();
  });

  test('handles schedule management', () => {
    render(<MobileBackupScheduler />);
    
    // Should show backup controls
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
  });
});

describe('WeddingDayEmergencyAccess Component Tests', () => {
  test('renders emergency interface', () => {
    render(<WeddingDayEmergencyAccess />);
    expect(screen.getByText(/Quick Access|Emergency/i)).toBeInTheDocument();
  });

  test('provides emergency contact access', () => {
    render(<WeddingDayEmergencyAccess />);
    
    const buttons = screen.getAllByRole('button');
    const contactButtons = buttons.filter(button => 
      button.textContent?.includes('Coordinator') || 
      button.textContent?.includes('Venue') ||
      button.textContent?.includes('Bride') ||
      button.textContent?.includes('Groom')
    );
    
    expect(contactButtons.length).toBeGreaterThan(0);
  });
});

describe('OfflineVendorContacts Component Tests', () => {
  test('renders vendor contacts interface', () => {
    render(<OfflineVendorContacts />);
    expect(screen.getByText(/Total Vendors|Vendor/i)).toBeInTheDocument();
  });

  test('provides search functionality', () => {
    render(<OfflineVendorContacts />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'photographer' } });
    expect(searchInput).toHaveValue('photographer');
  });
});

describe('CriticalDocumentAccess Component Tests', () => {
  test('renders document access interface', () => {
    render(<CriticalDocumentAccess />);
    expect(screen.getByText(/Document Storage|Storage/i)).toBeInTheDocument();
  });

  test('handles document operations', () => {
    render(<CriticalDocumentAccess />);
    
    // Should show document-related buttons
    const documentButtons = screen.getAllByRole('button');
    const actionButtons = documentButtons.filter(button => 
      button.textContent?.includes('View') || 
      button.textContent?.includes('Download') ||
      button.textContent?.includes('Share')
    );
    
    expect(actionButtons.length).toBeGreaterThan(0);
  });
});

describe('Accessibility Integration', () => {
  test('all components meet ARIA requirements', () => {
    const components = [
      MobileBackupManager,
      OfflineVendorContacts,
      CriticalDocumentAccess,
      WeddingDayEmergencyAccess
    ];

    components.forEach(Component => {
      const { container } = render(<Component />);
      
      // Check for proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      // Check for form labels
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        if (input.type !== 'hidden') {
          const label = container.querySelector(`label[for="${input.id}"]`);
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledby = input.getAttribute('aria-labelledby');
          
          expect(label || ariaLabel || ariaLabelledby).toBeTruthy();
        }
      });
    });
  });
});

describe('Error Handling Integration', () => {
  test('components handle API errors gracefully', async () => {
    // Mock console.error to track error handling
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MobileBackupManager />);
    render(<LocalBackupSync />);

    // Simulate API errors by rejecting promises
    mockNavigator.getBattery = jest.fn().mockRejectedValue(new Error('Battery API failed'));

    await waitFor(() => {
      // Components should still render despite API failures
      expect(screen.getByText(/Mobile Backup|Storage/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});

describe('Data Validation', () => {
  test('components validate input data correctly', () => {
    render(<OfflineVendorContacts />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    
    // Test various input types
    const testInputs = ['normal text', '123', '!@#$%', ''];
    
    testInputs.forEach(input => {
      fireEvent.change(searchInput, { target: { value: input } });
      expect(searchInput).toHaveValue(input);
    });
  });
});

describe('Wedding Industry Workflow Integration', () => {
  test('components work together for complete wedding workflow', async () => {
    // Simulate a complete wedding day workflow
    render(<MobileBackupManager />);
    render(<WeddingDayEmergencyAccess />);
    render(<OfflineVendorContacts />);

    // Should show wedding-specific content
    expect(screen.getByText(/Wedding|Vendor|Emergency/i)).toBeInTheDocument();

    // Test critical workflow paths
    const emergencyButtons = screen.getAllByRole('button');
    const criticalButtons = emergencyButtons.filter(button =>
      button.textContent?.includes('Emergency') ||
      button.textContent?.includes('Critical') ||
      button.textContent?.includes('Backup')
    );

    expect(criticalButtons.length).toBeGreaterThan(0);
  });
});