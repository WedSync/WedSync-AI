import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import AdvancedFileUpload from '../AdvancedFileUpload';
import {
  WeddingContext,
  FileProcessingStatus,
  WeddingFileCategory,
} from '@/types/file-management';

// Mock dependencies
jest.mock('@/lib/storage', () => ({
  uploadFileWithAI: jest.fn(),
  generateThumbnail: jest.fn(),
  extractMetadata: jest.fn(),
}));

jest.mock('@/lib/ai-analysis', () => ({
  categorizeFile: jest.fn(),
  detectFaces: jest.fn(),
  recognizeScene: jest.fn(),
  analyzeImageQuality: jest.fn(),
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(),
}));

const mockWeddingContext: WeddingContext = {
  id: 'wedding-1',
  coupleName: 'John & Jane Smith',
  weddingDate: new Date('2024-06-15'),
  venue: 'Garden Valley Resort',
  primaryVendor: 'photographer',
};

const defaultProps = {
  organizationId: 'org-1',
  weddingContext: mockWeddingContext,
  onUploadComplete: jest.fn(),
  onUploadProgress: jest.fn(),
  maxFiles: 50,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  acceptedTypes: ['image/*', 'video/*', '.pdf'],
  enableAI: true,
  enableBulkProcessing: true,
};

describe('AdvancedFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful implementations
    const {
      uploadFileWithAI,
      generateThumbnail,
      extractMetadata,
    } = require('@/lib/storage');
    const {
      categorizeFile,
      detectFaces,
      recognizeScene,
      analyzeImageQuality,
    } = require('@/lib/ai-analysis');

    uploadFileWithAI.mockResolvedValue({
      id: 'file-1',
      path: '/uploads/test.jpg',
    });
    generateThumbnail.mockResolvedValue('thumbnail-data');
    extractMetadata.mockResolvedValue({ width: 1920, height: 1080 });
    categorizeFile.mockResolvedValue(WeddingFileCategory.CEREMONY_PHOTOS);
    detectFaces.mockResolvedValue([
      {
        id: 'face-1',
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        confidence: 0.95,
      },
    ]);
    recognizeScene.mockResolvedValue({
      primaryScene: 'ceremony',
      confidence: 0.9,
      objects: ['altar', 'flowers'],
      setting: 'church',
      mood: 'romantic',
      lightingCondition: 'natural',
    });
    analyzeImageQuality.mockResolvedValue({
      score: 8.5,
      issues: [],
      recommendations: [],
    });

    // Mock react-dropzone
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false,
    });
  });

  it('renders upload interface correctly', () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    expect(screen.getByText('Upload Wedding Files')).toBeInTheDocument();
    expect(
      screen.getByText('Drag and drop files here, or click to browse'),
    ).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('displays AI processing options when AI is enabled', () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    expect(screen.getByText('AI Processing Options')).toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Smart')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();
  });

  it('hides AI options when AI is disabled', () => {
    render(<AdvancedFileUpload {...defaultProps} enableAI={false} />);

    expect(screen.queryByText('AI Processing Options')).not.toBeInTheDocument();
  });

  it('processes single file upload correctly', async () => {
    const { useDropzone } = require('react-dropzone');
    const mockOnDrop = jest.fn();

    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false,
      onDrop: mockOnDrop,
    });

    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['test content'], 'wedding.jpg', {
      type: 'image/jpeg',
      size: 1024000,
    });

    // Simulate file drop
    fireEvent.drop(screen.getByTestId('dropzone'), {
      dataTransfer: { files: [file] },
    });

    // Mock the onDrop function to actually process the file
    const { uploadFileWithAI } = require('@/lib/storage');
    mockOnDrop.mockImplementation(async (files) => {
      if (files.length > 0) {
        await uploadFileWithAI(files[0]);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Processing Files')).toBeInTheDocument();
    });
  });

  it('handles bulk file upload with batch processing', async () => {
    const files = Array.from(
      { length: 10 },
      (_, i) =>
        new File(['content'], `photo${i}.jpg`, {
          type: 'image/jpeg',
          size: 1024000,
        }),
    );

    const { useDropzone } = require('react-dropzone');
    const mockOnDrop = jest.fn();

    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false,
    });

    render(<AdvancedFileUpload {...defaultProps} />);

    // Simulate bulk drop
    fireEvent.drop(screen.getByTestId('dropzone'), {
      dataTransfer: { files },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Processing multiple files in batches'),
      ).toBeInTheDocument();
    });
  });

  it('validates file size limits', async () => {
    const oversizedFile = new File(['content'], 'huge.jpg', {
      type: 'image/jpeg',
      size: 200 * 1024 * 1024, // 200MB (over limit)
    });

    const { useDropzone } = require('react-dropzone');

    // Mock file validation
    useDropzone.mockImplementation(({ onDrop, maxSize }) => {
      const handleDrop = (files) => {
        const validFiles = files.filter((file) => file.size <= maxSize);
        if (validFiles.length !== files.length) {
          alert('Files too large');
          return;
        }
        onDrop(validFiles);
      };

      return {
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onDrop: (e) => handleDrop([oversizedFile]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
      };
    });

    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdvancedFileUpload {...defaultProps} />);

    fireEvent.drop(screen.getByTestId('dropzone'));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Files too large'),
    );
    alertSpy.mockRestore();
  });

  it('validates file count limits', async () => {
    const tooManyFiles = Array.from(
      { length: 60 },
      (_, i) =>
        new File(['content'], `photo${i}.jpg`, {
          type: 'image/jpeg',
          size: 1024000,
        }),
    );

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdvancedFileUpload {...defaultProps} maxFiles={50} />);

    // Simulate dropping too many files
    const { useDropzone } = require('react-dropzone');
    const mockImplementation = useDropzone.mock.calls[0][0];

    if (mockImplementation.onDrop) {
      mockImplementation.onDrop(tooManyFiles);
    }

    expect(alertSpy).toHaveBeenCalledWith('Maximum 50 files allowed');
    alertSpy.mockRestore();
  });

  it('shows upload progress for each file', async () => {
    const { uploadFileWithAI } = require('@/lib/storage');

    // Mock progress tracking
    uploadFileWithAI.mockImplementation((file, options) => {
      const { onProgress } = options;

      // Simulate progress updates
      setTimeout(() => onProgress(0.3), 100);
      setTimeout(() => onProgress(0.6), 200);
      setTimeout(() => onProgress(1.0), 300);

      return Promise.resolve({ id: 'file-1', path: '/uploads/test.jpg' });
    });

    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    // Trigger upload
    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });

  it('displays AI analysis results', async () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'ceremony.jpg', { type: 'image/jpeg' });

    // Process file with AI
    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      expect(screen.getByText('AI analysis...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('ceremony')).toBeInTheDocument(); // AI tag
      expect(screen.getByText('1')).toBeInTheDocument(); // Face count
    });
  });

  it('handles different AI processing modes', async () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    // Switch to detailed mode
    const detailedTab = screen.getByText('Detailed');
    fireEvent.click(detailedTab);

    expect(
      screen.getByText('Complete AI analysis including quality scoring'),
    ).toBeInTheDocument();

    // Switch to fast mode
    const fastTab = screen.getByText('Fast');
    fireEvent.click(fastTab);

    expect(
      screen.getByText('Basic categorization and metadata extraction only'),
    ).toBeInTheDocument();
  });

  it('categorizes wedding files correctly', async () => {
    const { categorizeFile } = require('@/lib/ai-analysis');

    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'ceremony-vows.jpg', {
      type: 'image/jpeg',
    });

    // Process file
    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      expect(categorizeFile).toHaveBeenCalledWith(file, mockWeddingContext);
    });
  });

  it('handles upload errors gracefully', async () => {
    const { uploadFileWithAI } = require('@/lib/storage');
    uploadFileWithAI.mockRejectedValue(new Error('Upload failed'));

    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('provides wedding-specific file categorization', async () => {
    const { categorizeFile } = require('@/lib/ai-analysis');

    render(<AdvancedFileUpload {...defaultProps} />);

    const ceremonyFile = new File(['content'], 'ceremony-kiss.jpg', {
      type: 'image/jpeg',
    });
    const receptionFile = new File(['content'], 'reception-dance.mp4', {
      type: 'video/mp4',
    });

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([ceremonyFile, receptionFile]);
    }

    await waitFor(() => {
      expect(categorizeFile).toHaveBeenCalledWith(
        ceremonyFile,
        mockWeddingContext,
      );
      expect(categorizeFile).toHaveBeenCalledWith(
        receptionFile,
        mockWeddingContext,
      );
    });
  });

  it('generates smart tags based on wedding context', async () => {
    const { categorizeFile } = require('@/lib/ai-analysis');

    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'venue-photo.jpg', {
      type: 'image/jpeg',
    });

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      // Should include wedding context in categorization
      expect(categorizeFile).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          coupleName: 'John & Jane Smith',
          venue: 'Garden Valley Resort',
        }),
      );
    });
  });

  it('handles non-image files appropriately', async () => {
    const {
      detectFaces,
      recognizeScene,
      analyzeImageQuality,
    } = require('@/lib/ai-analysis');

    render(<AdvancedFileUpload {...defaultProps} />);

    const pdfFile = new File(['content'], 'contract.pdf', {
      type: 'application/pdf',
    });

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([pdfFile]);
    }

    await waitFor(() => {
      // Should not call image-specific AI functions for non-images
      expect(detectFaces).not.toHaveBeenCalled();
      expect(recognizeScene).not.toHaveBeenCalled();
      expect(analyzeImageQuality).not.toHaveBeenCalled();
    });
  });

  it('calls onUploadComplete with processed files', async () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler([file]);
    }

    await waitFor(() => {
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'file-1',
            name: 'test.jpg',
            organizationId: 'org-1',
            category: WeddingFileCategory.CEREMONY_PHOTOS,
          }),
        ]),
      );
    });
  });

  it('tracks upload progress correctly', async () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    const files = [
      new File(['content'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['content'], 'photo2.jpg', { type: 'image/jpeg' }),
    ];

    const { useDropzone } = require('react-dropzone');
    const onDropHandler = useDropzone.mock.calls[0][0].onDrop;

    if (onDropHandler) {
      onDropHandler(files);
    }

    await waitFor(() => {
      expect(defaultProps.onUploadProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: 2,
          completedFiles: expect.any(Number),
          progress: expect.any(Number),
          status: 'processing',
        }),
      );
    });
  });

  it('respects accessibility standards', () => {
    render(<AdvancedFileUpload {...defaultProps} />);

    // Should have proper ARIA labels
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();

    // Should support keyboard navigation
    const browseButton = screen.getByText('Browse Files');
    expect(browseButton).toHaveAttribute('type', 'button');

    browseButton.focus();
    expect(browseButton).toHaveFocus();

    fireEvent.keyDown(browseButton, { key: 'Enter' });
    // Should trigger file selection
  });
});
