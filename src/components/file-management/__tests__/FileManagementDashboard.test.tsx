import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import FileManagementDashboard from '../FileManagementDashboard';
import {
  FileSystemFile,
  WeddingFileCategory,
  WeddingContext,
} from '@/types/file-management';

// Mock dependencies
jest.mock('@/lib/storage', () => ({
  createFolder: jest.fn(),
  deleteFile: jest.fn(),
  getStorageQuota: jest
    .fn()
    .mockResolvedValue({ used: 1000000, total: 10000000 }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock Supabase real-time
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: () => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }),
    from: () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({ data: [], error: null }),
    }),
  }),
}));

const mockFiles: FileSystemFile[] = [
  {
    id: '1',
    name: 'ceremony-001.jpg',
    path: '/ceremonies/ceremony-001.jpg',
    size: 2048000,
    mimeType: 'image/jpeg',
    organizationId: 'org-1',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2024-01-15T10:00:00Z'),
    category: WeddingFileCategory.CEREMONY_PHOTOS,
    tags: ['ceremony', 'altar', 'vows'],
    metadata: {
      width: 3000,
      height: 2000,
      camera: 'Canon EOS R5',
      aiAnalysis: {
        suggestedCategory: WeddingFileCategory.CEREMONY_PHOTOS,
        faces: [
          {
            id: 'face-1',
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            confidence: 0.95,
          },
        ],
        qualityScore: 8.5,
        smartTags: ['ceremony', 'bride', 'groom'],
      },
    },
    isProcessing: false,
  },
  {
    id: '2',
    name: 'reception-dance.mp4',
    path: '/reception/reception-dance.mp4',
    size: 50000000,
    mimeType: 'video/mp4',
    organizationId: 'org-1',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2024-01-15T20:00:00Z'),
    category: WeddingFileCategory.RECEPTION_VIDEO,
    tags: ['reception', 'dancing', 'celebration'],
    metadata: {
      duration: 180,
      bitrate: 8000,
    },
    isProcessing: false,
  },
];

const mockWeddingContext: WeddingContext = {
  id: 'wedding-1',
  coupleName: 'John & Jane Smith',
  weddingDate: new Date('2024-06-15'),
  venue: 'Garden Valley Resort',
  primaryVendor: 'photographer',
};

const defaultProps = {
  organizationId: 'org-1',
  currentUserId: 'user-1',
  initialFiles: mockFiles,
  weddingContext: mockWeddingContext,
  onFileSelect: jest.fn(),
  onFolderChange: jest.fn(),
  onFileAction: jest.fn(),
  enableCollaboration: true,
  enableAI: true,
};

describe('FileManagementDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard with file list', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    expect(screen.getByText('File Management')).toBeInTheDocument();
    expect(screen.getByText('ceremony-001.jpg')).toBeInTheDocument();
    expect(screen.getByText('reception-dance.mp4')).toBeInTheDocument();
  });

  it('displays wedding context information', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    expect(screen.getByText('John & Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Garden Valley Resort')).toBeInTheDocument();
  });

  it('shows storage quota correctly', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1.0 MB of 10.0 MB used/)).toBeInTheDocument();
    });
  });

  it('filters files by category', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Click on ceremony photos filter
    fireEvent.click(screen.getByText('Ceremony Photos'));

    await waitFor(() => {
      expect(screen.getByText('ceremony-001.jpg')).toBeInTheDocument();
      expect(screen.queryByText('reception-dance.mp4')).not.toBeInTheDocument();
    });
  });

  it('searches files by name', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'ceremony' } });

    await waitFor(() => {
      expect(screen.getByText('ceremony-001.jpg')).toBeInTheDocument();
      expect(screen.queryByText('reception-dance.mp4')).not.toBeInTheDocument();
    });
  });

  it('switches between grid and list view', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    const listViewButton = screen.getByLabelText('List view');
    fireEvent.click(listViewButton);

    // Grid view should switch to list view (implementation dependent)
    expect(listViewButton).toHaveClass('bg-gray-100'); // Assuming active class
  });

  it('handles file upload via drag and drop', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    const dropZone = screen.getByTestId('file-drop-zone');
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  it('opens file details when file is selected', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    fireEvent.click(screen.getByText('ceremony-001.jpg'));

    await waitFor(() => {
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
    });
  });

  it('creates new folder when requested', async () => {
    const { createFolder } = require('@/lib/storage');
    render(<FileManagementDashboard {...defaultProps} />);

    const newFolderButton = screen.getByText('New Folder');
    fireEvent.click(newFolderButton);

    const folderNameInput = screen.getByPlaceholderText('Folder name');
    fireEvent.change(folderNameInput, { target: { value: 'Wedding Photos' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(createFolder).toHaveBeenCalledWith('org-1', 'Wedding Photos', '/');
    });
  });

  it('handles file deletion', async () => {
    const { deleteFile } = require('@/lib/storage');
    render(<FileManagementDashboard {...defaultProps} />);

    // Right-click or use context menu to delete
    const file = screen.getByText('ceremony-001.jpg');
    fireEvent.contextMenu(file);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteFile).toHaveBeenCalledWith('1');
    });
  });

  it('displays file processing status', async () => {
    const processingFiles = [
      {
        ...mockFiles[0],
        isProcessing: true,
        processingStatus: 'AI_ANALYSIS',
      },
    ];

    render(
      <FileManagementDashboard
        {...defaultProps}
        initialFiles={processingFiles}
      />,
    );

    expect(screen.getByText('AI analysis...')).toBeInTheDocument();
  });

  it('handles bulk file operations', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Select multiple files
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select first file
    fireEvent.click(checkboxes[1]); // Select second file

    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // Perform bulk action
    const bulkDeleteButton = screen.getByText('Delete Selected');
    fireEvent.click(bulkDeleteButton);

    expect(screen.getByText('Delete 2 files?')).toBeInTheDocument();
  });

  it('shows real-time collaboration indicators', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Mock real-time collaboration data
    const collaboratorElement = screen.getByTestId('collaborators-list');
    expect(collaboratorElement).toBeInTheDocument();
  });

  it('handles folder navigation', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Create and navigate to folder
    const folderElement = screen.getByText('Ceremony');
    fireEvent.doubleClick(folderElement);

    await waitFor(() => {
      expect(defaultProps.onFolderChange).toHaveBeenCalledWith('/ceremony');
    });
  });

  it('displays AI insights when available', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('1 face detected')).toBeInTheDocument();
    expect(screen.getByText('Quality: 8.5/10')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const errorProps = {
      ...defaultProps,
      initialFiles: [],
    };

    // Mock storage error
    const { getStorageQuota } = require('@/lib/storage');
    getStorageQuota.mockRejectedValueOnce(new Error('Storage unavailable'));

    render(<FileManagementDashboard {...errorProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('Storage information unavailable'),
      ).toBeInTheDocument();
    });
  });

  it('respects accessibility requirements', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Check for ARIA labels
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
    expect(screen.getByLabelText('List view')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();

    // Check keyboard navigation
    const firstFile = screen.getByText('ceremony-001.jpg');
    firstFile.focus();
    expect(firstFile).toHaveFocus();

    fireEvent.keyDown(firstFile, { key: 'Enter' });
    expect(defaultProps.onFileSelect).toHaveBeenCalled();
  });

  it('handles mobile responsive layout', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    render(<FileManagementDashboard {...defaultProps} />);

    // Mobile-specific elements should be present
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
  });

  it('performs optimally with large file lists', async () => {
    const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
      ...mockFiles[0],
      id: `file-${i}`,
      name: `photo-${i}.jpg`,
    }));

    const start = performance.now();
    render(
      <FileManagementDashboard {...defaultProps} initialFiles={manyFiles} />,
    );
    const end = performance.now();

    // Should render within reasonable time (< 1000ms)
    expect(end - start).toBeLessThan(1000);

    // Should use virtualization for performance
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
});

// Integration tests
describe('FileManagementDashboard Integration', () => {
  it('integrates with file upload and processing pipeline', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Upload file
    const dropZone = screen.getByTestId('file-drop-zone');
    const file = new File(['test content'], 'wedding.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Should show processing states
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText('AI analysis...')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText('Complete')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('maintains real-time synchronization with other users', async () => {
    render(<FileManagementDashboard {...defaultProps} />);

    // Simulate another user adding a file
    const newFile: FileSystemFile = {
      id: '3',
      name: 'shared-photo.jpg',
      path: '/shared/shared-photo.jpg',
      size: 1024000,
      mimeType: 'image/jpeg',
      organizationId: 'org-1',
      uploadedBy: 'user-2',
      uploadedAt: new Date(),
      category: WeddingFileCategory.COUPLE_PORTRAITS,
      tags: ['shared'],
      metadata: {},
      isProcessing: false,
    };

    // Mock Supabase real-time event
    const { createClient } = require('@supabase/supabase-js');
    const mockChannel = createClient().channel();

    // Trigger real-time update
    mockChannel.on.mockImplementation((event, callback) => {
      if (event === 'postgres_changes') {
        setTimeout(() => {
          callback({
            eventType: 'INSERT',
            new: newFile,
          });
        }, 100);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('shared-photo.jpg')).toBeInTheDocument();
    });
  });
});
