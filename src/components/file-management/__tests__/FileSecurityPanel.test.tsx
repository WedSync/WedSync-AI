import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import FileSecurityPanel from '../FileSecurityPanel';
import { FileSystemFile, WeddingFileCategory } from '@/types/file-management';

const mockFile: FileSystemFile = {
  id: 'file-1',
  name: 'wedding-ceremony.jpg',
  path: '/ceremony/wedding-ceremony.jpg',
  size: 2048000,
  mimeType: 'image/jpeg',
  organizationId: 'org-1',
  uploadedBy: 'user-1',
  uploadedAt: new Date('2024-01-15T10:00:00Z'),
  category: WeddingFileCategory.CEREMONY_PHOTOS,
  tags: ['ceremony', 'altar'],
  metadata: {},
  isProcessing: false,
};

const defaultProps = {
  file: mockFile,
  organizationId: 'org-1',
  currentUserId: 'user-1',
  onSecurityUpdate: jest.fn(),
  onAuditLog: jest.fn(),
};

// Mock the API functions
const mockSecuritySettings = {
  accessLevel: 'organization' as const,
  allowedUsers: ['user-1', 'user-2'],
  allowedRoles: ['admin', 'editor'],
  permissions: {
    view: true,
    download: true,
    share: false,
    edit: false,
    delete: false,
  },
  requireAuthentication: true,
  allowedDomains: [],
  watermarkEnabled: false,
  downloadTracking: true,
  geoRestrictions: [],
  dataRetentionPeriod: 2555,
  gdprCompliant: true,
  encryptionRequired: false,
};

const mockViolations = [
  {
    id: 'violation-1',
    type: 'unauthorized_access' as const,
    severity: 'high' as const,
    description: 'Unauthorized download attempt from suspicious IP',
    timestamp: new Date('2024-01-15T15:00:00Z'),
    resolved: false,
  },
];

const mockAuditLogs = [
  {
    fileId: 'file-1',
    userId: 'user-1',
    action: 'file_viewed',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    ipAddress: '192.168.1.1',
  },
  {
    fileId: 'file-1',
    userId: 'user-2',
    action: 'file_downloaded',
    timestamp: new Date('2024-01-15T11:00:00Z'),
    ipAddress: '192.168.1.2',
  },
];

// Mock the module functions
jest.mock('../FileSecurityPanel', () => {
  const actual = jest.requireActual('../FileSecurityPanel');

  // Mock the async functions used in the component
  global.fetchFileSecuritySettings = jest
    .fn()
    .mockResolvedValue(mockSecuritySettings);
  global.fetchAuditLogs = jest.fn().mockResolvedValue(mockAuditLogs);
  global.fetchSecurityViolations = jest.fn().mockResolvedValue(mockViolations);
  global.checkComplianceStatus = jest.fn().mockResolvedValue({
    gdpr: true,
    retention: true,
    encryption: false,
    access: true,
  });
  global.createSecureShareLink = jest.fn().mockResolvedValue({
    id: 'link-123',
    url: 'https://secure.wedsync.com/share/file-1?token=abc123',
    expiresAt: new Date(Date.now() + 86400000), // 24 hours
  });

  return actual;
});

describe('FileSecurityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders security overview with correct information', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Security Overview')).toBeInTheDocument();
      expect(screen.getByText(/\d+% Secure/)).toBeInTheDocument();
    });

    expect(screen.getByText('GDPR Compliant')).toBeInTheDocument();
    expect(screen.getByText('Access Controlled')).toBeInTheDocument();
  });

  it('displays security violations when present', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/unresolved security violation/),
      ).toBeInTheDocument();
    });
  });

  it('allows updating access level', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const accessTab = screen.getByText('Access Control');
      fireEvent.click(accessTab);
    });

    const accessSelect = screen.getByRole('combobox');
    fireEvent.click(accessSelect);

    const privateOption = screen.getByText('Private (Owner Only)');
    fireEvent.click(privateOption);

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          accessLevel: 'private',
        }),
      );
    });
  });

  it('toggles permissions correctly', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const accessTab = screen.getByText('Access Control');
      fireEvent.click(accessTab);
    });

    const downloadSwitch = screen.getByLabelText('Download');
    fireEvent.click(downloadSwitch);

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          permissions: expect.objectContaining({
            download: false,
          }),
        }),
      );
    });
  });

  it('enables watermark protection', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const accessTab = screen.getByText('Access Control');
      fireEvent.click(accessTab);
    });

    const watermarkSwitch = screen.getByLabelText('Enable Watermark');
    fireEvent.click(watermarkSwitch);

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          watermarkEnabled: true,
        }),
      );
    });
  });

  it('configures secure sharing options', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const sharingTab = screen.getByText('Secure Sharing');
      fireEvent.click(sharingTab);
    });

    const domainsTextarea = screen.getByPlaceholderText(
      'example.com\nweddings.org',
    );
    fireEvent.change(domainsTextarea, {
      target: { value: 'wedsync.com\nexample.com' },
    });

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          allowedDomains: ['wedsync.com', 'example.com'],
        }),
      );
    });
  });

  it('generates secure share links', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const sharingTab = screen.getByText('Secure Sharing');
      fireEvent.click(sharingTab);
    });

    const generateLinkButton = screen.getByText('Generate Secure Share Link');
    fireEvent.click(generateLinkButton);

    await waitFor(() => {
      expect(defaultProps.onAuditLog).toHaveBeenCalledWith({
        fileId: 'file-1',
        userId: 'user-1',
        action: 'secure_link_generated',
        timestamp: expect.any(Date),
        additionalInfo: { linkId: 'link-123' },
      });
    });
  });

  it('manages GDPR compliance settings', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const complianceTab = screen.getByText('Compliance');
      fireEvent.click(complianceTab);
    });

    const retentionSelect = screen.getByRole('combobox');
    fireEvent.click(retentionSelect);

    const fiveYearOption = screen.getByText('5 Years');
    fireEvent.click(fiveYearOption);

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          dataRetentionPeriod: 1825,
        }),
      );
    });
  });

  it('displays data processing rights badges', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const complianceTab = screen.getByText('Compliance');
      fireEvent.click(complianceTab);
    });

    expect(screen.getByText('Right to Access')).toBeInTheDocument();
    expect(screen.getByText('Right to Rectification')).toBeInTheDocument();
    expect(screen.getByText('Right to Erasure')).toBeInTheDocument();
    expect(screen.getByText('Data Portability')).toBeInTheDocument();
  });

  it('shows security violations with correct severity', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const violationsTab = screen.getByText('Violations');
      fireEvent.click(violationsTab);
    });

    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('UNAUTHORIZED_ACCESS')).toBeInTheDocument();
    expect(
      screen.getByText('Unauthorized download attempt from suspicious IP'),
    ).toBeInTheDocument();
  });

  it('resolves security violations', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const violationsTab = screen.getByText('Violations');
      fireEvent.click(violationsTab);
    });

    const resolveButton = screen.getByText('Resolve');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(defaultProps.onAuditLog).toHaveBeenCalledWith({
        fileId: 'file-1',
        userId: 'user-1',
        action: 'violation_resolved',
        timestamp: expect.any(Date),
        additionalInfo: { violationId: 'violation-1' },
      });
    });
  });

  it('displays audit log with proper formatting', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const auditTab = screen.getByText('Audit Log');
      fireEvent.click(auditTab);
    });

    expect(screen.getByText('file viewed')).toBeInTheDocument();
    expect(screen.getByText('file downloaded')).toBeInTheDocument();
    expect(screen.getByText(/User user-1/)).toBeInTheDocument();
    expect(screen.getByText(/User user-2/)).toBeInTheDocument();
  });

  it('calculates security score correctly', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const securityScore = screen.getByText(/\d+% Secure/);
      expect(securityScore).toBeInTheDocument();

      // Score should be based on security settings
      const scoreValue = parseInt(
        securityScore.textContent?.match(/\d+/)?.[0] || '0',
      );
      expect(scoreValue).toBeGreaterThan(0);
      expect(scoreValue).toBeLessThanOrEqual(100);
    });
  });

  it('shows no violations state when secure', async () => {
    // Mock no violations
    global.fetchSecurityViolations = jest.fn().mockResolvedValue([]);

    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const violationsTab = screen.getByText('Violations');
      fireEvent.click(violationsTab);
    });

    expect(
      screen.getByText('No security violations detected'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your file security is working properly'),
    ).toBeInTheDocument();
  });

  it('handles encryption requirements', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const accessTab = screen.getByText('Access Control');
      fireEvent.click(accessTab);
    });

    const encryptionSwitch = screen.getByLabelText('Require Encryption');
    fireEvent.click(encryptionSwitch);

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          encryptionRequired: true,
        }),
      );
    });
  });

  it('sets link expiration for secure sharing', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const sharingTab = screen.getByText('Secure Sharing');
      fireEvent.click(sharingTab);
    });

    const expiryInput = screen.getByDisplayValue('');
    const futureDate = new Date(Date.now() + 86400000)
      .toISOString()
      .slice(0, 16);

    fireEvent.change(expiryInput, { target: { value: futureDate } });

    await waitFor(() => {
      expect(defaultProps.onSecurityUpdate).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          expiryDate: expect.any(Date),
        }),
      );
    });
  });

  it('displays compliance status indicators correctly', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      // Should show green checkmarks for compliant items
      const gdprIndicator =
        screen.getByText('GDPR Compliant').previousElementSibling;
      expect(gdprIndicator).toHaveClass('text-green-600');

      const accessIndicator =
        screen.getByText('Access Controlled').previousElementSibling;
      expect(accessIndicator).toHaveClass('text-green-600');
    });
  });

  it('handles loading state appropriately', async () => {
    // Mock slow loading
    global.fetchFileSecuritySettings = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockSecuritySettings), 1000),
        ),
    );

    render(<FileSecurityPanel {...defaultProps} />);

    // Should show loading skeleton
    expect(screen.getAllByTestId(/loading-skeleton/i)).toHaveLength(3);

    await waitFor(
      () => {
        expect(screen.getByText('Security Overview')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('logs all security changes appropriately', async () => {
    render(<FileSecurityPanel {...defaultProps} />);

    await waitFor(() => {
      const accessTab = screen.getByText('Access Control');
      fireEvent.click(accessTab);
    });

    // Make multiple changes
    const shareSwitch = screen.getByLabelText('Share');
    fireEvent.click(shareSwitch);

    const watermarkSwitch = screen.getByLabelText('Enable Watermark');
    fireEvent.click(watermarkSwitch);

    await waitFor(() => {
      expect(defaultProps.onAuditLog).toHaveBeenCalledTimes(2);
      expect(defaultProps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security_settings_updated',
          additionalInfo: expect.any(Object),
        }),
      );
    });
  });
});
