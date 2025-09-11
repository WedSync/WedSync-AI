import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { RealtimeReportGenerator } from '../RealtimeReportGenerator';
import { ReportTemplate, RealtimeReportJob } from '../../types';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

// Mock useWebSocket hook
vi.mock('../useWebSocket', () => ({
  useReportWebSocket: () => ({
    isConnected: true,
    connectionState: 'connected',
    error: null,
    sendMessage: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    lastMessage: null,
    startReportGeneration: vi.fn(),
    cancelReportGeneration: vi.fn(),
    pauseReportGeneration: vi.fn(),
    resumeReportGeneration: vi.fn(),
    getJobStatus: vi.fn(),
    subscribeToJob: vi.fn(),
    unsubscribeFromJob: vi.fn(),
  }),
}));

// Mock motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe('RealtimeReportGenerator', () => {
  const mockTemplate: ReportTemplate = {
    id: 'test-template',
    name: 'Wedding Revenue Report',
    description: 'Real-time revenue analytics',
    category: 'financial',
    sections: [
      {
        id: 'revenue-section',
        type: 'chart',
        title: 'Revenue Chart',
        chartType: 'bar',
        position: 0,
        config: { showLegend: true },
      },
    ],
    layout: { columns: 1, spacing: 'medium', responsive: true },
    style: {
      theme: 'wedding',
      colors: { primary: '#c59d6c', secondary: '#8b6f47', accent: '#d4af37' },
    },
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    tags: ['revenue', 'realtime'],
  };

  const mockJob: RealtimeReportJob = {
    id: 'job-123',
    templateId: 'test-template',
    status: 'running',
    progress: 45,
    startTime: new Date('2024-01-20T10:00:00Z'),
    estimatedCompletion: new Date('2024-01-20T10:05:00Z'),
    currentStep: 'Processing revenue data',
    totalSteps: 5,
    completedSteps: 2,
    options: {
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
      includeComparisons: true,
      realTimeUpdates: true,
    },
    vendorId: 'vendor-123',
    metadata: {
      dataPoints: 1500,
      processedRecords: 675,
      estimatedSize: '2.3MB',
    },
  };

  const defaultProps = {
    template: mockTemplate,
    onJobComplete: vi.fn(),
    onJobError: vi.fn(),
    onJobProgress: vi.fn(),
    websocketUrl: 'ws://localhost:3001/reports',
    autoStart: false,
    className: 'test-generator',
  };

  const mockUseReportWebSocket = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset WebSocket mock
    mockUseReportWebSocket.mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      error: null,
      sendMessage: vi.fn().mockReturnValue(true),
      reconnect: vi.fn(),
      disconnect: vi.fn(),
      lastMessage: null,
      startReportGeneration: vi.fn(),
      cancelReportGeneration: vi.fn(),
      pauseReportGeneration: vi.fn(),
      resumeReportGeneration: vi.fn(),
      getJobStatus: vi.fn(),
      subscribeToJob: vi.fn(),
      unsubscribeFromJob: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders report generator interface', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(
        screen.getByTestId('realtime-report-generator'),
      ).toBeInTheDocument();
      expect(screen.getByText('Wedding Revenue Report')).toBeInTheDocument();
    });

    it('shows connection status', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('displays template information', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(
        screen.getByText('Real-time revenue analytics'),
      ).toBeInTheDocument();
      expect(screen.getByText(/1 section/i)).toBeInTheDocument();
    });

    it('shows generation controls', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /start generation/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /configure options/i }),
      ).toBeInTheDocument();
    });
  });

  describe('WebSocket Connection', () => {
    it('establishes WebSocket connection on mount', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001/reports');
    });

    it('handles connection errors gracefully', () => {
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        isConnected: false,
        connectionState: 'error',
        error: 'Connection failed',
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reconnect/i }),
      ).toBeInTheDocument();
    });

    it('shows reconnection attempts', () => {
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        isConnected: false,
        connectionState: 'connecting',
        reconnectAttempts: 3,
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(
        screen.getByText(/reconnecting \(attempt 3\)/i),
      ).toBeInTheDocument();
    });

    it('handles manual reconnection', () => {
      const mockReconnect = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        isConnected: false,
        connectionState: 'error',
        reconnect: mockReconnect,
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      const reconnectButton = screen.getByRole('button', {
        name: /reconnect/i,
      });
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalled();
    });
  });

  describe('Report Generation', () => {
    it('starts report generation when button clicked', () => {
      const mockStartGeneration = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        startReportGeneration: mockStartGeneration,
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      const startButton = screen.getByRole('button', {
        name: /start generation/i,
      });
      fireEvent.click(startButton);

      expect(mockStartGeneration).toHaveBeenCalledWith(
        expect.any(String), // jobId
        mockTemplate,
        expect.any(Object), // options
      );
    });

    it('auto-starts generation when autoStart is true', () => {
      const mockStartGeneration = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        startReportGeneration: mockStartGeneration,
      });

      render(<RealtimeReportGenerator {...defaultProps} autoStart />);

      expect(mockStartGeneration).toHaveBeenCalled();
    });

    it('shows generation options modal', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      const optionsButton = screen.getByRole('button', {
        name: /configure options/i,
      });
      fireEvent.click(optionsButton);

      expect(
        screen.getByTestId('generation-options-modal'),
      ).toBeInTheDocument();
    });

    it('configures generation options before starting', () => {
      render(<RealtimeReportGenerator {...defaultProps} />);

      const optionsButton = screen.getByRole('button', {
        name: /configure options/i,
      });
      fireEvent.click(optionsButton);

      const dateRangeInput = screen.getByLabelText(/date range/i);
      fireEvent.change(dateRangeInput, { target: { value: 'last-30-days' } });

      const startButton = screen.getByRole('button', {
        name: /start with options/i,
      });
      fireEvent.click(startButton);

      expect(
        screen.queryByTestId('generation-options-modal'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('displays generation progress', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('Processing revenue data')).toBeInTheDocument();
    });

    it('shows step-by-step progress', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
      expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    });

    it('displays estimated completion time', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByText(/estimated completion/i)).toBeInTheDocument();
      expect(screen.getByText(/~3 minutes remaining/i)).toBeInTheDocument();
    });

    it('updates progress in real-time', async () => {
      const { rerender } = render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByText('45%')).toBeInTheDocument();

      const updatedJob = {
        ...mockJob,
        progress: 75,
        currentStep: 'Generating charts',
      };
      rerender(
        <RealtimeReportGenerator {...defaultProps} currentJob={updatedJob} />,
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Generating charts')).toBeInTheDocument();
    });
  });

  describe('Job Control', () => {
    it('allows pausing generation', () => {
      const mockPause = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        pauseReportGeneration: mockPause,
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      expect(mockPause).toHaveBeenCalledWith('job-123');
    });

    it('allows resuming paused generation', () => {
      const mockResume = vi.fn();
      const pausedJob = { ...mockJob, status: 'paused' as const };

      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        resumeReportGeneration: mockResume,
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={pausedJob} />,
      );

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      fireEvent.click(resumeButton);

      expect(mockResume).toHaveBeenCalledWith('job-123');
    });

    it('allows canceling generation', () => {
      const mockCancel = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        cancelReportGeneration: mockCancel,
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should show confirmation dialog
      expect(screen.getByText(/cancel generation/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: /confirm cancel/i,
      });
      fireEvent.click(confirmButton);

      expect(mockCancel).toHaveBeenCalledWith('job-123');
    });

    it('refreshes job status on demand', () => {
      const mockGetStatus = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        getJobStatus: mockGetStatus,
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      const refreshButton = screen.getByRole('button', {
        name: /refresh status/i,
      });
      fireEvent.click(refreshButton);

      expect(mockGetStatus).toHaveBeenCalledWith('job-123');
    });
  });

  describe('Real-time Updates', () => {
    it('handles progress update messages', () => {
      const mockOnProgress = vi.fn();
      render(
        <RealtimeReportGenerator
          {...defaultProps}
          onJobProgress={mockOnProgress}
        />,
      );

      // Simulate WebSocket message
      act(() => {
        const progressMessage = {
          type: 'progress',
          data: {
            jobId: 'job-123',
            progress: 60,
            currentStep: 'Calculating metrics',
            completedSteps: 3,
          },
        };

        // Trigger progress update
        mockOnProgress(progressMessage.data);
      });

      expect(mockOnProgress).toHaveBeenCalledWith({
        jobId: 'job-123',
        progress: 60,
        currentStep: 'Calculating metrics',
        completedSteps: 3,
      });
    });

    it('handles job completion messages', () => {
      const mockOnComplete = vi.fn();
      render(
        <RealtimeReportGenerator
          {...defaultProps}
          onJobComplete={mockOnComplete}
        />,
      );

      act(() => {
        const completionMessage = {
          jobId: 'job-123',
          result: {
            reportId: 'report-456',
            downloadUrl: '/reports/report-456.pdf',
            generatedAt: new Date().toISOString(),
          },
        };

        mockOnComplete(completionMessage.jobId, completionMessage.result);
      });

      expect(mockOnComplete).toHaveBeenCalledWith(
        'job-123',
        expect.any(Object),
      );
    });

    it('handles job error messages', () => {
      const mockOnError = vi.fn();
      render(
        <RealtimeReportGenerator {...defaultProps} onJobError={mockOnError} />,
      );

      act(() => {
        const errorMessage = {
          jobId: 'job-123',
          error: 'Failed to process revenue data',
        };

        mockOnError(errorMessage.jobId, errorMessage.error);
      });

      expect(mockOnError).toHaveBeenCalledWith(
        'job-123',
        'Failed to process revenue data',
      );
    });

    it('shows real-time data processing statistics', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByText('1,500 data points')).toBeInTheDocument();
      expect(screen.getByText('675 records processed')).toBeInTheDocument();
      expect(screen.getByText('Estimated size: 2.3MB')).toBeInTheDocument();
    });
  });

  describe('Wedding Day Protection', () => {
    it('shows wedding day warning on Saturdays', () => {
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(screen.getByTestId('wedding-day-warning')).toBeInTheDocument();
      expect(screen.getByText(/wedding day mode active/i)).toBeInTheDocument();
    });

    it('disables generation on active wedding days', () => {
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(<RealtimeReportGenerator {...defaultProps} />);

      const startButton = screen.getByRole('button', {
        name: /start generation/i,
      });
      expect(startButton).toBeDisabled();
      expect(
        screen.getByText(/generation disabled during weddings/i),
      ).toBeInTheDocument();
    });

    it('allows emergency override with confirmation', () => {
      const mockSaturday = new Date('2024-06-15');
      vi.setSystemTime(mockSaturday);

      render(
        <RealtimeReportGenerator {...defaultProps} allowEmergencyOverride />,
      );

      const emergencyButton = screen.getByRole('button', {
        name: /emergency override/i,
      });
      fireEvent.click(emergencyButton);

      expect(
        screen.getByText(/emergency override confirmation/i),
      ).toBeInTheDocument();
    });
  });

  describe('Performance and Resource Management', () => {
    it('monitors system resources during generation', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByTestId('resource-monitor')).toBeInTheDocument();
      expect(screen.getByText(/cpu usage/i)).toBeInTheDocument();
      expect(screen.getByText(/memory usage/i)).toBeInTheDocument();
    });

    it('throttles WebSocket messages for performance', () => {
      const mockSendMessage = vi.fn();
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        sendMessage: mockSendMessage,
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      const refreshButton = screen.getByRole('button', {
        name: /refresh status/i,
      });

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton);
      }

      // Should throttle to prevent spam
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    it('implements backpressure for high-volume updates', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      // Should show backpressure indicator when updates are too frequent
      act(() => {
        // Simulate high-frequency updates
        for (let i = 0; i < 100; i++) {
          defaultProps.onJobProgress({
            jobId: 'job-123',
            progress: i,
            currentStep: `Step ${i}`,
            completedSteps: i,
          });
        }
      });

      expect(screen.getByTestId('backpressure-warning')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('shows error state when generation fails', () => {
      const errorJob = {
        ...mockJob,
        status: 'failed' as const,
        error: 'Database connection failed',
      };

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={errorJob} />,
      );

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(
        screen.getByText('Database connection failed'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('allows retrying failed generations', () => {
      const mockStartGeneration = vi.fn();
      const errorJob = { ...mockJob, status: 'failed' as const };

      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        startReportGeneration: mockStartGeneration,
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={errorJob} />,
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockStartGeneration).toHaveBeenCalled();
    });

    it('handles WebSocket disconnection gracefully', () => {
      mockUseReportWebSocket.mockReturnValue({
        ...mockUseReportWebSocket(),
        isConnected: false,
        connectionState: 'disconnected',
      });

      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByTestId('disconnected-warning')).toBeInTheDocument();
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });

    it('provides diagnostic information for troubleshooting', () => {
      render(<RealtimeReportGenerator {...defaultProps} showDiagnostics />);

      expect(screen.getByTestId('diagnostics-panel')).toBeInTheDocument();
      expect(screen.getByText(/websocket status/i)).toBeInTheDocument();
      expect(screen.getByText(/last heartbeat/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '45',
      );
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuemin',
        '0',
      );
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuemax',
        '100',
      );
    });

    it('announces progress updates to screen readers', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent(
        'Processing revenue data - 45% complete',
      );
    });

    it('supports keyboard navigation of controls', () => {
      render(
        <RealtimeReportGenerator {...defaultProps} currentJob={mockJob} />,
      );

      const controls = screen.getAllByRole('button');
      controls.forEach((control) => {
        expect(control).toHaveAttribute('tabIndex', '0');
      });
    });

    it('provides high contrast support', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      render(<RealtimeReportGenerator {...defaultProps} />);

      expect(screen.getByTestId('realtime-report-generator')).toHaveClass(
        'high-contrast',
      );
    });
  });
});
