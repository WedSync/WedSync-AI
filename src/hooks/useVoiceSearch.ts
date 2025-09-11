'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceSearchResult {
  query: string;
  articles: any[];
  suggestions: string[];
  voiceResponse?: string;
}

interface VoiceSearchState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  results: VoiceSearchResult | null;
  isProcessing: boolean;
  confidence: number;
}

interface UseVoiceSearchOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResults?: (results: VoiceSearchResult) => void;
  onError?: (error: string) => void;
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}) {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResults,
    onError,
  } = options;

  const [state, setState] = useState<VoiceSearchState>({
    isListening: false,
    transcript: '',
    error: null,
    results: null,
    isProcessing: false,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializedRef.current) return;

    // Check for speech recognition support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error: 'Speech recognition not supported in this browser',
      }));
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    // Handle recognition results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence;

        setState((prev) => ({
          ...prev,
          transcript,
          confidence,
          error: null,
        }));

        // If this is a final result and we have a transcript, process it
        if (lastResult.isFinal && transcript.trim()) {
          processVoiceSearch(transcript);
        }
      }
    };

    // Handle recognition start
    recognition.onstart = () => {
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: '',
      }));

      // Set a timeout to stop listening after 30 seconds
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    };

    // Handle recognition end
    recognition.onend = () => {
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Handle recognition errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isListening: false,
      }));
      onError?.(errorMessage);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Handle no speech detected
    recognition.onnomatch = () => {
      setState((prev) => ({
        ...prev,
        error: 'No speech detected. Please try again.',
        isListening: false,
      }));
    };

    recognitionRef.current = recognition;
    isInitializedRef.current = true;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onError]);

  // Process voice search query
  const processVoiceSearch = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const response = await fetch('/api/wedme/knowledge/voice-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: transcript,
            originalQuery: transcript,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const results = await response.json();

        setState((prev) => ({
          ...prev,
          results,
          isProcessing: false,
        }));

        onResults?.(results);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Search failed';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isProcessing: false,
        }));
        onError?.(errorMessage);
      }
    },
    [onResults, onError],
  );

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Speech recognition not available',
      }));
      return;
    }

    if (state.isListening) return;

    try {
      setState((prev) => ({
        ...prev,
        error: null,
        transcript: '',
        results: null,
        confidence: 0,
      }));

      recognitionRef.current.start();
    } catch (error) {
      const errorMessage = 'Failed to start speech recognition';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [state.isListening, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isListening: false,
      transcript: '',
      error: null,
      results: null,
      isProcessing: false,
      confidence: 0,
    });
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Check if voice search is supported
  const isSupported = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    resetState,
    isSupported,
    processVoiceSearch,
  };
}

// Helper function to get user-friendly error messages
function getErrorMessage(error: SpeechRecognitionErrorCode): string {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'audio-capture':
      return 'Audio capture failed. Check your microphone.';
    case 'network':
      return 'Network error occurred during recognition.';
    case 'not-allowed':
      return 'Microphone access denied. Please enable microphone permissions.';
    case 'service-not-allowed':
      return 'Speech recognition service not allowed.';
    case 'bad-grammar':
      return 'Speech recognition grammar error.';
    case 'language-not-supported':
      return 'Language not supported for speech recognition.';
    default:
      return 'Speech recognition error occurred. Please try again.';
  }
}

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: SpeechRecognitionErrorCode;
    message?: string;
  }

  type SpeechRecognitionErrorCode =
    | 'no-speech'
    | 'aborted'
    | 'audio-capture'
    | 'network'
    | 'not-allowed'
    | 'service-not-allowed'
    | 'bad-grammar'
    | 'language-not-supported';
}
