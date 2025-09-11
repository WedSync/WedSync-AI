import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PDFAnalysisUploader } from '@/app/dashboard/pdf-analysis/components/PDFAnalysisUploader';

// Mock fetch globally
global.fetch = jest.fn();

const mockOnUploadSuccess = jest.fn();
const mockOnUploadError = jest.fn();

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['dummy content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Helper function to create mock drag/drop events - EXTRACTED TO REDUCE NESTING
const createMockDragEvents = (file: File) => {
  const dragEvent = new Event('dragover', { bubbles: true });
  const dropEvent = Object.assign(new Event('drop', { bubbles: true }), {
    dataTransfer: {
      files: [file],
    },
  });
  return { dragEvent, dropEvent };
};

// Helper functions for error expectations - EXTRACTED TO REDUCE NESTING
const expectFileTooLargeError = (mockOnUploadError: jest.Mock, maxSize: string) => {
  expect(mockOnUploadError).toHaveBeenCalledWith({
    message: `File size must be under ${maxSize} to ensure quick analysis`,
    code: 'FILE_TOO_LARGE',
  });
};

const expectInvalidFileTypeError = (mockOnUploadError: jest.Mock) => {
  expect(mockOnUploadError).toHaveBeenCalledWith({
    message: 'Only PDF files are supported for wedding form analysis',
    code: 'INVALID_FILE_TYPE',
  });
};

const expectUploadFailedError = (mockOnUploadError: jest.Mock) => {
  expect(mockOnUploadError).toHaveBeenCalledWith({
    message: 'Failed to upload your wedding form. Please try again.',
    code: 'UPLOAD_FAILED',
  });
};

describe('PDFAnalysisUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload interface with wedding-specific messaging', () => {
    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    expect(
      screen.getByText('Upload Wedding Forms for AI Analysis'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Drop your PDF wedding forms here/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Our AI will extract client details/),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  it('displays file requirements and limitations', () => {
    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    expect(
      screen.getByText('• PDF files only, max 10MB each'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Client questionnaires, contracts, and planning forms supported/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('• Analysis typically takes 2-3 minutes'),
    ).toBeInTheDocument();
  });

  it('accepts valid PDF files', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysisId: 'test-analysis-id' }),
    });

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const validPDF = createMockFile(
      'wedding-form.pdf',
      2 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, validPDF);
    }

    await waitFor(() => {
      expect(screen.getByText('wedding-form.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    });
  });

  it('rejects files that are too large', async () => {
    const user = userEvent.setup();

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
        maxFileSize={5 * 1024 * 1024} // 5MB limit
      />,
    );

    const largePDF = createMockFile(
      'large-wedding-form.pdf',
      15 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, largePDF);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/File size must be under 5MB/),
      ).toBeInTheDocument();
      expectFileTooLargeError(mockOnUploadError, '5MB');
    });
  });

  it('rejects non-PDF files with wedding-specific error message', async () => {
    const user = userEvent.setup();

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const invalidFile = createMockFile(
      'wedding-photo.jpg',
      1 * 1024 * 1024,
      'image/jpeg',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, invalidFile);
    }

    await waitFor(() => {
      expect(
        screen.getByText(
          'Only PDF files are supported for wedding form analysis',
        ),
      ).toBeInTheDocument();
      expectInvalidFileTypeError(mockOnUploadError);
    });
  });

  it('shows upload progress during file upload', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ analysisId: 'test-analysis-id' }),
              }),
            1000,
          ),
        ),
    );

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const validPDF = createMockFile(
      'wedding-form.pdf',
      2 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, validPDF);
    }

    // Check that progress indicators appear
    await waitFor(
      () => {
        expect(screen.getByText(/\d+%/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('calls onUploadSuccess when file upload completes', async () => {
    const user = userEvent.setup();
    const mockAnalysisId = 'test-analysis-id-123';

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysisId: mockAnalysisId }),
    });

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const validPDF = createMockFile(
      'wedding-questionnaire.pdf',
      1 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, validPDF);
    }

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledWith(
        mockAnalysisId,
        validPDF,
      );
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });
  });

  it('handles upload failures gracefully', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const validPDF = createMockFile(
      'wedding-form.pdf',
      1 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, validPDF);
    }

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Failed to upload your wedding form. Please try again.',
        ),
      ).toBeInTheDocument();
      expectUploadFailedError(mockOnUploadError);
    });
  });

  it('supports drag and drop functionality', async () => {
    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const dropZone = screen
      .getByRole('button', { name: /choose files/i })
      .closest('.cursor-pointer');
    const validPDF = createMockFile(
      'wedding-contract.pdf',
      1 * 1024 * 1024,
      'application/pdf',
    );

    // Create mock drag and drop events using helper
    const { dragEvent, dropEvent } = createMockDragEvents(validPDF);

    if (dropZone) {
      fireEvent(dropZone, dragEvent);
      fireEvent(dropZone, dropEvent);
    }

    await waitFor(() => {
      expect(screen.getByText('wedding-contract.pdf')).toBeInTheDocument();
    });
  });

  it('allows removing files from upload queue', async () => {
    const user = userEvent.setup();

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const validPDF = createMockFile(
      'wedding-form.pdf',
      1 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, validPDF);
    }

    await waitFor(() => {
      expect(screen.getByText('wedding-form.pdf')).toBeInTheDocument();
    });

    // Find and click the remove button
    const removeButton = screen.getByRole('button', { name: '' }); // X button typically has no text
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('wedding-form.pdf')).not.toBeInTheDocument();
    });
  });

  it('disables interface when disabled prop is true', () => {
    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
        disabled={true}
      />,
    );

    const chooseFilesButton = screen.getByRole('button', {
      name: /choose files/i,
    });
    const fileInput = chooseFilesButton.querySelector('input[type="file"]');

    expect(chooseFilesButton).toBeDisabled();
    expect(fileInput).toBeDisabled();
    expect(
      screen
        .getByRole('button', { name: /choose files/i })
        .closest('.cursor-pointer'),
    ).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('displays correct file size formatting', async () => {
    const user = userEvent.setup();

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const smallPDF = createMockFile(
      'small-form.pdf',
      512 * 1024,
      'application/pdf',
    ); // 0.5 MB
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, smallPDF);
    }

    await waitFor(() => {
      expect(screen.getByText('0.5 MB')).toBeInTheDocument();
    });
  });

  it('handles multiple file uploads correctly', async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ analysisId: 'test-analysis-id' }),
    });

    render(
      <PDFAnalysisUploader
        onUploadSuccess={mockOnUploadSuccess}
        onUploadError={mockOnUploadError}
      />,
    );

    const file1 = createMockFile(
      'questionnaire.pdf',
      1 * 1024 * 1024,
      'application/pdf',
    );
    const file2 = createMockFile(
      'contract.pdf',
      2 * 1024 * 1024,
      'application/pdf',
    );
    const fileInput = screen
      .getByRole('button', { name: /choose files/i })
      .querySelector('input[type="file"]');

    if (fileInput) {
      await user.upload(fileInput, [file1, file2]);
    }

    await waitFor(() => {
      expect(screen.getByText('questionnaire.pdf')).toBeInTheDocument();
      expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    });
  });
});
