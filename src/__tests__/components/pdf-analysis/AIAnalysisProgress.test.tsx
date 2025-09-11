import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIAnalysisProgress } from '@/app/dashboard/pdf-analysis/components/AIAnalysisProgress';

// Mock WebSocket
class MockWebSocket {
  constructor(public url: string) {}

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  close() {
    // Intentionally empty - Mock WebSocket close for testing
    // In real WebSocket, this would cleanup connection resources
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  // Helper method to simulate connection opening
  simulateOpen() {
    if (this.onopen) {
      this.onopen({} as Event);
    }
  }

  // Helper method to simulate connection closing
  simulateClose() {
    if (this.onclose) {
      this.onclose({} as CloseEvent);
    }
  }
}

// Replace the global WebSocket with our mock
(global as any).WebSocket = MockWebSocket;

const mockOnAnalysisComplete = jest.fn();
const mockOnAnalysisError = jest.fn();

describe('AIAnalysisProgress', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial analysis progress interface', () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-questionnaire.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    expect(screen.getByText('AI Analysis in Progress')).toBeInTheDocument();
    expect(
      screen.getByText(/Analyzing "wedding-questionnaire.pdf"/),
    ).toBeInTheDocument();
    expect(screen.getByText('Analysis Steps')).toBeInTheDocument();
  });

  it('displays all analysis stages with correct titles', () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('PDF Analysis')).toBeInTheDocument();
    expect(screen.getByText('Visual Recognition')).toBeInTheDocument();
    expect(screen.getByText('Data Extraction')).toBeInTheDocument();
    expect(screen.getByText('Quality Check')).toBeInTheDocument();
  });

  it('shows wedding-specific stage descriptions', () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="client-details.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    expect(
      screen.getByText('Uploading your wedding form to secure servers'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Using AI to identify form layouts and visual elements'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Extracting client details and wedding preferences'),
    ).toBeInTheDocument();
  });

  it('displays initial connection status as connecting', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    // Should show "Connecting..." initially
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('updates connection status when WebSocket connects', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    // Simulate WebSocket connection
    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    // Get the WebSocket instance and simulate opening
    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('updates progress when receiving WebSocket messages', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    // Simulate progress update for PDF parsing stage
    wsCall.simulateMessage({
      stage: 'pdf_parsing',
      status: 'in-progress',
      progress: 45,
      startTime: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText('PDF Analysis')).toBeInTheDocument();
      // Should show progress updates
      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });
  });

  it('displays extracted data when analysis completes', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    // Simulate completion with extracted data
    const completionData = {
      analysisStatus: 'completed',
      stage: 'completed',
      status: 'completed',
      progress: 100,
      extractedData: {
        clientName: 'Emily & James Smith',
        weddingDate: '2024-06-15',
        venue: 'Ashridge House',
        fields: [
          {
            name: 'Bride Name',
            type: 'text',
            value: 'Emily Smith',
            confidence: 95,
          },
          {
            name: 'Groom Name',
            type: 'text',
            value: 'James Smith',
            confidence: 94,
          },
        ],
      },
      metrics: {
        fieldsExtracted: 25,
        confidenceScore: 92,
        processingTime: 127,
        dataQuality: 'high',
      },
      downloadUrl: 'https://example.com/download',
    };

    wsCall.simulateMessage(completionData);

    await waitFor(() => {
      expect(screen.getByText('Extracted Wedding Details')).toBeInTheDocument();
      expect(screen.getByText('Emily & James Smith')).toBeInTheDocument();
      expect(screen.getByText('2024-06-15')).toBeInTheDocument();
      expect(screen.getByText('Ashridge House')).toBeInTheDocument();
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
      expect(screen.getByText('Analysis Complete!')).toBeInTheDocument();
      expect(screen.getByText('Download Form')).toBeInTheDocument();
    });
  });

  it('calls onAnalysisComplete when analysis finishes successfully', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    const completionData = {
      analysisStatus: 'completed',
      extractedData: { clientName: 'Test Couple' },
    };

    wsCall.simulateMessage(completionData);

    await waitFor(() => {
      expect(mockOnAnalysisComplete).toHaveBeenCalled();
    });
  });

  it('handles analysis failure and calls onAnalysisError', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    // Simulate analysis failure
    wsCall.simulateMessage({
      analysisStatus: 'failed',
      error: 'Unable to parse PDF structure',
    });

    await waitFor(() => {
      expect(screen.getByText(/Analysis failed/)).toBeInTheDocument();
      expect(mockOnAnalysisError).toHaveBeenCalledWith(
        'Unable to parse PDF structure',
      );
    });
  });

  it('displays connection error when WebSocket fails', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];

    // Simulate WebSocket error
    if (wsCall.onerror) {
      wsCall.onerror({} as Event);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/Connection to analysis service lost/),
      ).toBeInTheDocument();
    });
  });

  it('shows current stage information prominently', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    // Simulate vision analysis stage
    wsCall.simulateMessage({
      stage: 'vision_analysis',
      status: 'in-progress',
      progress: 60,
    });

    await waitFor(() => {
      expect(screen.getByText('Visual Recognition')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Using AI to identify form layouts and visual elements',
        ),
      ).toBeInTheDocument();
    });
  });

  it('displays estimated duration for stages', () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    // Should show estimated durations
    expect(screen.getByText(/Estimated:/)).toBeInTheDocument();
  });

  it('formats duration correctly', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    // Test duration formatting logic
    expect(screen.getByText('30s')).toBeInTheDocument(); // PDF parsing: 30 seconds
    expect(screen.getByText('45s')).toBeInTheDocument(); // Vision analysis: 45 seconds
    expect(screen.getByText('1m 0s')).toBeInTheDocument(); // Field extraction: 60 seconds
  });

  it('attempts reconnection when WebSocket closes during processing', async () => {
    render(
      <AIAnalysisProgress
        analysisId="test-analysis-123"
        fileName="wedding-form.pdf"
        onAnalysisComplete={mockOnAnalysisComplete}
        onAnalysisError={mockOnAnalysisError}
      />,
    );

    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalled();
    });

    const wsCall = (MockWebSocket as any).mock.instances[0];
    wsCall.simulateOpen();

    // Simulate WebSocket closing during processing
    wsCall.simulateClose();

    // Should attempt to reconnect after 3 seconds
    setTimeout(() => {
      expect(MockWebSocket).toHaveBeenCalledTimes(2);
    }, 3100);
  });
});
