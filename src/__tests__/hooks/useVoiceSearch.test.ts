import { renderHook, act, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onresult: null,
  onstart: null,
  onend: null,
  onerror: null,
  onnomatch: null,
  lang: 'en-US',
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
};

const mockWebkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);

// Mock window.SpeechRecognition
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockWebkitSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: mockWebkitSpeechRecognition,
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('useVoiceSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          articles: [
            {
              id: 'article-1',
              title: 'Wedding Venue Guide',
              excerpt: 'How to choose the perfect venue',
              relevanceScore: 10,
            },
          ],
          suggestions: [
            'How to book a venue?',
            'What questions to ask venues?',
          ],
          voiceResponse: 'I found helpful articles about wedding venues.',
          searchInfo: {
            totalResults: 1,
            searchTime: Date.now(),
            category: 'venue',
          },
        }),
    });

    // Reset SpeechRecognition mocks
    mockSpeechRecognition.start.mockClear();
    mockSpeechRecognition.stop.mockClear();
    mockSpeechRecognition.abort.mockClear();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useVoiceSearch());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.results).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.confidence).toBe(0);
  });

  it('detects speech recognition support', () => {
    const { result } = renderHook(() => useVoiceSearch());

    expect(result.current.isSupported()).toBe(true);
  });

  it('handles lack of speech recognition support', () => {
    // Temporarily remove speech recognition
    const originalSpeechRecognition = window.SpeechRecognition;
    const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceSearch());

    expect(result.current.isSupported()).toBe(false);
    expect(result.current.error).toBe(
      'Speech recognition not supported in this browser',
    );

    // Restore
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('starts listening correctly', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('stops listening correctly', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    // First start listening
    act(() => {
      result.current.startListening();
    });

    // Simulate start event
    act(() => {
      mockSpeechRecognition.onstart?.();
    });

    await waitFor(() => {
      expect(result.current.isListening).toBe(true);
    });

    // Then stop
    act(() => {
      result.current.stopListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('toggles listening state', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    // Start listening via toggle
    act(() => {
      result.current.toggleListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();

    // Simulate start event
    act(() => {
      mockSpeechRecognition.onstart?.();
    });

    await waitFor(() => {
      expect(result.current.isListening).toBe(true);
    });

    // Stop listening via toggle
    act(() => {
      result.current.toggleListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('handles speech recognition results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [
          {
            transcript: 'how to choose a wedding venue',
            confidence: 0.95,
            isFinal: true,
          },
        ],
      ],
    };

    act(() => {
      mockSpeechRecognition.onresult?.(mockEvent as any);
    });

    await waitFor(() => {
      expect(result.current.transcript).toBe('how to choose a wedding venue');
      expect(result.current.confidence).toBe(0.95);
    });

    // Should trigger API call for final result
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/wedme/knowledge/voice-search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'how to choose a wedding venue',
            originalQuery: 'how to choose a wedding venue',
          }),
        },
      );
    });
  });

  it('handles interim results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    // Simulate interim result (not final)
    const mockEvent = {
      results: [
        [
          {
            transcript: 'how to choose a',
            confidence: 0.8,
            isFinal: false,
          },
        ],
      ],
    };

    act(() => {
      mockSpeechRecognition.onresult?.(mockEvent as any);
    });

    await waitFor(() => {
      expect(result.current.transcript).toBe('how to choose a');
      expect(result.current.confidence).toBe(0.8);
    });

    // Should NOT trigger API call for interim result
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles speech recognition errors', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    // Simulate error
    const mockError = { error: 'no-speech' };

    act(() => {
      mockSpeechRecognition.onerror?.(mockError as any);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'No speech was detected. Please try again.',
      );
      expect(result.current.isListening).toBe(false);
    });
  });

  it('handles various speech recognition error types', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    const errorTests = [
      {
        error: 'not-allowed',
        expected:
          'Microphone access denied. Please enable microphone permissions.',
      },
      {
        error: 'network',
        expected: 'Network error occurred during recognition.',
      },
      {
        error: 'audio-capture',
        expected: 'Audio capture failed. Check your microphone.',
      },
      {
        error: 'language-not-supported',
        expected: 'Language not supported for speech recognition.',
      },
      {
        error: 'unknown',
        expected: 'Speech recognition error occurred. Please try again.',
      },
    ];

    for (const errorTest of errorTests) {
      act(() => {
        result.current.resetState();
        result.current.startListening();
      });

      act(() => {
        mockSpeechRecognition.onerror?.({ error: errorTest.error } as any);
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorTest.expected);
      });
    }
  });

  it('handles no match event', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockSpeechRecognition.onnomatch?.();
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'No speech detected. Please try again.',
      );
      expect(result.current.isListening).toBe(false);
    });
  });

  it('processes voice search API response correctly', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await result.current.processVoiceSearch('wedding venue tips');
    });

    await waitFor(() => {
      expect(result.current.results).toEqual({
        articles: [
          {
            id: 'article-1',
            title: 'Wedding Venue Guide',
            excerpt: 'How to choose the perfect venue',
            relevanceScore: 10,
          },
        ],
        suggestions: ['How to book a venue?', 'What questions to ask venues?'],
        voiceResponse: 'I found helpful articles about wedding venues.',
        searchInfo: {
          totalResults: 1,
          searchTime: expect.any(Number),
          category: 'venue',
        },
      });
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await result.current.processVoiceSearch('wedding venue tips');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it('handles API 400 errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
    });

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await result.current.processVoiceSearch('wedding venue tips');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed: 400');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  it('sets timeout for long listening sessions', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    // Simulate start event
    act(() => {
      mockSpeechRecognition.onstart?.();
    });

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useVoiceSearch());

    // Set some state first
    act(() => {
      result.current.startListening();
      mockSpeechRecognition.onresult?.({
        results: [
          [
            {
              transcript: 'test transcript',
              confidence: 0.9,
              isFinal: false,
            },
          ],
        ],
      } as any);
    });

    act(() => {
      result.current.resetState();
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.results).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.confidence).toBe(0);
  });

  it('handles custom options correctly', () => {
    const onResults = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useVoiceSearch({
        language: 'en-GB',
        continuous: true,
        interimResults: false,
        maxAlternatives: 3,
        onResults,
        onError,
      }),
    );

    act(() => {
      result.current.startListening();
    });

    // Check that speech recognition is configured correctly
    expect(mockSpeechRecognition.lang).toBe('en-GB');
    expect(mockSpeechRecognition.continuous).toBe(true);
    expect(mockSpeechRecognition.interimResults).toBe(false);
    expect(mockSpeechRecognition.maxAlternatives).toBe(3);

    // Test callback functions
    const mockResults = {
      articles: [],
      suggestions: [],
      voiceResponse: 'Test response',
    };

    act(() => {
      mockSpeechRecognition.onresult?.({
        results: [
          [
            {
              transcript: 'test',
              confidence: 0.9,
              isFinal: true,
            },
          ],
        ],
      } as any);
    });

    // onResults should be called when processing completes
    waitFor(() => {
      expect(onResults).toHaveBeenCalledWith(
        expect.objectContaining(mockResults),
      );
    });

    // Test error callback
    act(() => {
      mockSpeechRecognition.onerror?.({ error: 'no-speech' } as any);
    });

    expect(onError).toHaveBeenCalledWith(
      'No speech was detected. Please try again.',
    );
  });

  it('prevents starting when already listening', () => {
    const { result } = renderHook(() => useVoiceSearch());

    act(() => {
      result.current.startListening();
    });

    // Simulate start event
    act(() => {
      mockSpeechRecognition.onstart?.();
    });

    const startCallCount = mockSpeechRecognition.start.mock.calls.length;

    // Try to start again while listening
    act(() => {
      result.current.startListening();
    });

    // Should not call start again
    expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(startCallCount);
  });
});
