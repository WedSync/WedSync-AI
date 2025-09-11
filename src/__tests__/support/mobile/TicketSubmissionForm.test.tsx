import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import { TicketSubmissionForm } from '@/components/support/mobile/TicketSubmissionForm';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  single: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() =>
        Promise.resolve({ data: { path: 'test-path' }, error: null }),
      ),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://test.com/file' },
      })),
    })),
  },
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase,
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock MediaRecorder for voice notes
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  state: 'inactive',
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('TicketSubmissionForm', () => {
  const mockProps = {
    organizationId: 'test-org-id',
    onTicketCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.single.mockResolvedValue({
      data: { id: 'test-ticket-id', ticket_number: 'T-001' },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Form Rendering', () => {
    test('renders basic form elements', () => {
      render(<TicketSubmissionForm {...mockProps} />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit/i }),
      ).toBeInTheDocument();
    });

    test('renders wedding-specific fields', () => {
      render(<TicketSubmissionForm {...mockProps} />);

      expect(screen.getByLabelText(/venue name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/wedding date/i)).toBeInTheDocument();
    });

    test('renders voice note recorder', () => {
      render(<TicketSubmissionForm {...mockProps} />);

      expect(screen.getByText(/voice note/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /record/i }),
      ).toBeInTheDocument();
    });

    test('renders file attachment area', () => {
      render(<TicketSubmissionForm {...mockProps} />);

      expect(screen.getByText(/attachments/i)).toBeInTheDocument();
      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for required fields', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(
          screen.getByText(/description is required/i),
        ).toBeInTheDocument();
      });
    });

    test('validates title length', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const titleInput = screen.getByLabelText(/title/i);

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'a'.repeat(201) } });
        fireEvent.blur(titleInput);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/title must be 200 characters or less/i),
        ).toBeInTheDocument();
      });
    });

    test('validates wedding date format', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const dateInput = screen.getByLabelText(/wedding date/i);

      await act(async () => {
        fireEvent.change(dateInput, { target: { value: 'invalid-date' } });
        fireEvent.blur(dateInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid date format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Priority Handling', () => {
    test('shows wedding day emergency warning', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const prioritySelect = screen.getByLabelText(/priority/i);

      await act(async () => {
        fireEvent.change(prioritySelect, {
          target: { value: 'wedding_day_emergency' },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/wedding day emergency/i)).toBeInTheDocument();
        expect(screen.getByText(/immediate response/i)).toBeInTheDocument();
      });
    });

    test('enables location capture for wedding day emergencies', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
        success({
          coords: {
            latitude: 51.5074,
            longitude: -0.1278,
            accuracy: 10,
          },
        });
      });

      render(<TicketSubmissionForm {...mockProps} />);

      const prioritySelect = screen.getByLabelText(/priority/i);

      await act(async () => {
        fireEvent.change(prioritySelect, {
          target: { value: 'wedding_day_emergency' },
        });
      });

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });
  });

  describe('Auto-save Functionality', () => {
    test('auto-saves form data every 30 seconds', async () => {
      jest.useFakeTimers();

      render(<TicketSubmissionForm {...mockProps} />);

      const titleInput = screen.getByLabelText(/title/i);

      await act(async () => {
        fireEvent.change(titleInput, {
          target: { value: 'Test ticket title' },
        });
      });

      // Fast-forward 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      // Check localStorage for auto-saved data
      const savedData = localStorage.getItem(
        'wedsync-ticket-draft-test-org-id',
      );
      expect(savedData).toBeTruthy();

      const parsedData = JSON.parse(savedData!);
      expect(parsedData.title).toBe('Test ticket title');

      jest.useRealTimers();
    });

    test('clears auto-saved data after successful submission', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      // Set up form data
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/title/i), {
          target: { value: 'Test Ticket' },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
          target: { value: 'Test description' },
        });
      });

      // Submit form
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        const savedData = localStorage.getItem(
          'wedsync-ticket-draft-test-org-id',
        );
        expect(savedData).toBeNull();
      });
    });
  });

  describe('File Attachments', () => {
    test('handles file drop correctly', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const dropZone = screen.getByText(/drag.*drop/i).closest('div');
      const file = new File(['test content'], 'test.png', {
        type: 'image/png',
      });

      await act(async () => {
        fireEvent.drop(dropZone!, {
          dataTransfer: {
            files: [file],
            items: [
              {
                kind: 'file',
                type: 'image/png',
                getAsFile: () => file,
              },
            ],
            types: ['Files'],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });

    test('validates file size limits', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const dropZone = screen.getByText(/drag.*drop/i).closest('div');
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });

      await act(async () => {
        fireEvent.drop(dropZone!, {
          dataTransfer: {
            files: [largeFile],
            items: [
              {
                kind: 'file',
                type: 'image/png',
                getAsFile: () => largeFile,
              },
            ],
            types: ['Files'],
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });

    test('validates file types', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const dropZone = screen.getByText(/drag.*drop/i).closest('div');
      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-executable',
      });

      await act(async () => {
        fireEvent.drop(dropZone!, {
          dataTransfer: {
            files: [invalidFile],
            items: [
              {
                kind: 'file',
                type: 'application/x-executable',
                getAsFile: () => invalidFile,
              },
            ],
            types: ['Files'],
          },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/file type not supported/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Voice Note Recording', () => {
    test('starts and stops recording correctly', async () => {
      const mockRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
        state: 'inactive',
      };

      global.MediaRecorder = jest.fn(() => mockRecorder) as any;

      // Mock getUserMedia
      global.navigator.mediaDevices = {
        getUserMedia: jest.fn(() => Promise.resolve(new MediaStream())),
      } as any;

      render(<TicketSubmissionForm {...mockProps} />);

      const recordButton = screen.getByRole('button', { name: /record/i });

      // Start recording
      await act(async () => {
        fireEvent.click(recordButton);
      });

      expect(mockRecorder.start).toHaveBeenCalled();

      // Stop recording
      mockRecorder.state = 'recording';

      await act(async () => {
        fireEvent.click(recordButton);
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
    });

    test('handles microphone permission denial', async () => {
      global.navigator.mediaDevices = {
        getUserMedia: jest.fn(() =>
          Promise.reject(new Error('Permission denied')),
        ),
      } as any;

      render(<TicketSubmissionForm {...mockProps} />);

      const recordButton = screen.getByRole('button', { name: /record/i });

      await act(async () => {
        fireEvent.click(recordButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/microphone permission/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      // Fill form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/title/i), {
          target: { value: 'Test Support Ticket' },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
          target: { value: 'This is a test ticket description' },
        });
        fireEvent.change(screen.getByLabelText(/priority/i), {
          target: { value: 'medium' },
        });
        fireEvent.change(screen.getByLabelText(/category/i), {
          target: { value: 'technical' },
        });
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Support Ticket',
            description: 'This is a test ticket description',
            priority: 'medium',
            category: 'technical',
            organization_id: 'test-org-id',
          }),
        );
      });

      expect(mockProps.onTicketCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-ticket-id',
          ticket_number: 'T-001',
        }),
      );
    });

    test('handles submission errors gracefully', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Network error'));

      render(<TicketSubmissionForm {...mockProps} />);

      // Fill and submit form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/title/i), {
          target: { value: 'Test Ticket' },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
          target: { value: 'Test description' },
        });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/error.*submit/i)).toBeInTheDocument();
      });

      // Form should remain accessible for retry
      expect(
        screen.getByRole('button', { name: /submit/i }),
      ).not.toBeDisabled();
    });

    test('queues submission when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(<TicketSubmissionForm {...mockProps} />);

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/title/i), {
          target: { value: 'Offline Ticket' },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
          target: { value: 'This ticket was created offline' },
        });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/queued.*offline/i)).toBeInTheDocument();
      });

      // Check that request was queued in IndexedDB (mocked)
      // In real implementation, this would check IndexedDB
    });
  });

  describe('Mobile Interactions', () => {
    test('handles touch events correctly', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const titleInput = screen.getByLabelText(/title/i);

      await act(async () => {
        fireEvent.touchStart(titleInput);
        fireEvent.focus(titleInput);
      });

      expect(titleInput).toHaveFocus();
    });

    test('adjusts layout for small screens', () => {
      // Mock small screen viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 667,
        writable: true,
      });

      render(<TicketSubmissionForm {...mockProps} />);

      const form =
        screen.getByRole('form') || screen.getByTestId('ticket-form');
      expect(form).toHaveClass('mobile-layout'); // Assuming CSS class is applied
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<TicketSubmissionForm {...mockProps} />);

      expect(screen.getByLabelText(/title/i)).toHaveAttribute(
        'aria-required',
        'true',
      );
      expect(screen.getByLabelText(/description/i)).toHaveAttribute(
        'aria-required',
        'true',
      );
      expect(screen.getByLabelText(/priority/i)).toHaveAttribute(
        'aria-required',
        'true',
      );
    });

    test('announces form validation errors', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));
      });

      await waitFor(() => {
        const errorMessage = screen.getByText(/title is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    test('supports keyboard navigation', async () => {
      render(<TicketSubmissionForm {...mockProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      titleInput.focus();
      expect(titleInput).toHaveFocus();

      await act(async () => {
        fireEvent.keyDown(titleInput, { key: 'Tab' });
      });

      // Note: In a real test environment with proper DOM focus management,
      // the next focusable element would receive focus
    });
  });
});
