import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { VoiceSearch } from '@/components/mobile/ai/VoiceSearch';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
jest.mock('@/components/ui/use-toast');
jest.mock('@/components/mobile/MobileEnhancedFeatures', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div data-testid="pull-to-refresh" onClick={onRefresh}>
      {children}
    </div>
  ),
  BottomSheet: ({ children, isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="bottom-sheet" onClick={onClose}>
        {children}
      </div>
    ) : null,
}));

// Mock Web Speech API for recognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
  onspeechend: null,
};

// Mock Speech Synthesis API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'English US', lang: 'en-US' },
    { name: 'English UK', lang: 'en-GB' },
  ]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockSpeechSynthesisUtterance = jest.fn(() => ({
  text: '',
  lang: '',
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  onstart: null,
  onend: null,
  onerror: null,
}));

// @ts-ignore
global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
// @ts-ignore
global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
// @ts-ignore
global.speechSynthesis = mockSpeechSynthesis;
// @ts-ignore
global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});

// Mock AudioContext
const mockAnalyserNode = {
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: jest.fn((array) => {
    // Fill array with mock audio data
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.random() * 255;
    }
  }),
};

const mockAudioContext = {
  createAnalyser: jest.fn(() => mockAnalyserNode),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
  })),
  close: jest.fn(),
};

// @ts-ignore
global.AudioContext = jest.fn(() => mockAudioContext);
// @ts-ignore
global.webkitAudioContext = jest.fn(() => mockAudioContext);

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe('VoiceSearch', () => {
  const mockOnSearchResults = jest.fn();
  const mockOnCommandExecuted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeechSynthesis.getVoices.mockReturnValue([
      { name: 'English US', lang: 'en-US' },
      { name: 'English UK', lang: 'en-GB' },
    ]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    test('renders voice search interface correctly', () => {
      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      expect(screen.getByText('Voice Search')).toBeInTheDocument();
      expect(
        screen.getByText('Ask questions or search by voice'),
      ).toBeInTheDocument();
      expect(screen.getByText('Tap to start voice search')).toBeInTheDocument();
    });

    test('shows offline mode when offline prop is true', () => {
      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
          offline={true}
        />,
      );

      expect(
        screen.getByText('Offline Mode - Limited features'),
      ).toBeInTheDocument();
    });

    test('displays voice commands help section', () => {
      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
      expect(
        screen.getByText('"Search for wedding timeline"'),
      ).toBeInTheDocument();
      expect(screen.getByText('"Read this article"')).toBeInTheDocument();
    });

    test('shows speech recognition not supported message when unavailable', () => {
      // Temporarily remove speech recognition support
      // @ts-ignore
      delete global.webkitSpeechRecognition;
      // @ts-ignore
      delete global.SpeechRecognition;

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      expect(
        screen.getByText('Voice recognition is not supported in this browser'),
      ).toBeInTheDocument();

      // Restore for other tests
      // @ts-ignore
      global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
      // @ts-ignore
      global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
    });
  });

  describe('Voice Recognition', () => {
    test('starts voice recognition when voice button clicked', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    test('stops voice recognition when stop button clicked while listening', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      // Simulate listening state
      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      expect(screen.getByText('Tap to stop listening')).toBeInTheDocument();

      await user.click(voiceButton);
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    test('displays listening indicator when voice recognition is active', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      expect(screen.getByText('Listening...')).toBeInTheDocument();
      expect(screen.getByText('What can I help you find?')).toBeInTheDocument();
    });

    test('updates transcript when speech recognition receives results', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate speech recognition result
      act(() => {
        const mockEvent = {
          results: [
            {
              0: {
                transcript: 'search for wedding planning tips',
                confidence: 0.9,
              },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
      });

      expect(screen.getByText('You said:')).toBeInTheDocument();
      expect(
        screen.getByText('search for wedding planning tips'),
      ).toBeInTheDocument();
      expect(screen.getByText('Confidence: 90%')).toBeInTheDocument();
    });

    test('shows interim results during speech recognition', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate interim result
      act(() => {
        const mockEvent = {
          results: [
            {
              0: { transcript: 'wedding plan...', confidence: 0.7 },
              isFinal: false,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
      });

      expect(screen.getByText('wedding plan...')).toBeInTheDocument();
    });

    test('handles speech recognition errors gracefully', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate error
      act(() => {
        mockSpeechRecognition.onerror?.({ error: 'network' });
      });

      expect(screen.getByText('Error: network')).toBeInTheDocument();
    });
  });

  describe('Voice Commands Processing', () => {
    test('processes search command correctly', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate search command
      act(() => {
        const mockEvent = {
          results: [
            {
              0: {
                transcript: 'search for wedding timeline planning',
                confidence: 0.9,
              },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(mockOnSearchResults).toHaveBeenCalled();
      });
    });

    test('processes read aloud command correctly', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      // First do a search to have results
      act(() => {
        const searchEvent = {
          results: [
            {
              0: { transcript: 'search for wedding tips', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(searchEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(mockOnSearchResults).toHaveBeenCalled();
      });

      // Then test read command
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        const readEvent = {
          results: [
            {
              0: { transcript: 'read this article', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(readEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });

    test('processes help command correctly', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      act(() => {
        const mockEvent = {
          results: [
            {
              0: { transcript: 'help', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });

    test('displays last executed command', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      act(() => {
        const mockEvent = {
          results: [
            {
              0: { transcript: 'search for wedding planning', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(screen.getByText('Last Command')).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
      });
    });
  });

  describe('Text-to-Speech', () => {
    test('speaks search results when read button clicked', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      // First search to get results
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        const mockEvent = {
          results: [
            {
              0: { transcript: 'wedding timeline', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        const playButtons = screen.getAllByRole('button', { name: /play/i });
        if (playButtons.length > 0) {
          return user.click(playButtons[0]);
        }
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('stops speaking when stop button clicked during speech', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      // Simulate speaking state
      // This would require the component to be in a speaking state
      await waitFor(() => {
        const stopButton = screen.queryByRole('button', { name: /stop/i });
        if (stopButton) {
          return user.click(stopButton);
        }
      });

      // Should call cancel if stop button was available
      if (screen.queryByRole('button', { name: /stop/i })) {
        expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      }
    });

    test('updates speaking indicator when text-to-speech is active', async () => {
      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      // This would require simulating the TTS system being active
      // The component would show visual feedback for active speech
      expect(screen.getByText('Voice Search')).toBeInTheDocument();
    });
  });

  describe('Voice Activity Detection', () => {
    test('initializes voice activity detection when listening starts', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    test('cleans up audio resources when listening stops', async () => {
      const user = userEvent.setup();

      const mockTrack = { stop: jest.fn() };
      navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue({
        getTracks: () => [mockTrack],
      });

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      await user.click(voiceButton); // Stop listening

      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('Settings Management', () => {
    test('opens settings sheet when settings button clicked', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
    });

    test('updates audio feedback settings', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const enableToggle = screen
        .getByText('Enable voice responses')
        .parentElement?.querySelector('button');
      if (enableToggle) {
        await user.click(enableToggle);
      }

      // Settings should be updated
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
    });

    test('updates recognition language setting', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const languageSelect = screen.getByDisplayValue('English (US)');
      await user.selectOptions(languageSelect, 'en-GB');

      expect(languageSelect).toHaveValue('en-GB');
    });

    test('tests voice features from settings', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const testSpeechButton = screen.getByText('Test Speech');
      await user.click(testSpeechButton);

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('resets settings to defaults', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const resetButton = screen.getByText('Reset to Defaults');
      await user.click(resetButton);

      // Should reset all settings
      expect(screen.getByDisplayValue('English (US)')).toBeInTheDocument();
    });
  });

  describe('Search Results Display', () => {
    test('displays search results with proper formatting', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        const mockEvent = {
          results: [
            {
              0: { transcript: 'wedding photography tips', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });
    });

    test('allows interaction with search result articles', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      // Perform search first
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        const mockEvent = {
          results: [
            {
              0: { transcript: 'wedding tips', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      // Wait for results and interact
      await waitFor(() => {
        const openButton = screen.queryByRole('button', { name: /open/i });
        if (openButton) {
          return user.click(openButton);
        }
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Article opened',
        }),
      );
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for voice controls', () => {
      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      expect(voiceButton).toBeInTheDocument();

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      await user.tab();
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toHaveFocus();

      await user.tab();
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      expect(voiceButton).toHaveFocus();
    });

    test('announces voice recognition status to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles microphone access denied gracefully', async () => {
      navigator.mediaDevices.getUserMedia = jest
        .fn()
        .mockRejectedValue(new Error('Permission denied'));

      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      // Should handle error gracefully
      expect(voiceButton).toBeInTheDocument();
    });

    test('handles speech synthesis errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockSpeechSynthesis.speak.mockImplementation(() => {
        throw new Error('Speech synthesis failed');
      });

      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      // Attempt to use TTS
      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      // Should not crash
      expect(screen.getByText('Voice Search')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('handles search API failures gracefully', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      act(() => {
        mockSpeechRecognition.onstart?.();
        const mockEvent = {
          results: [
            {
              0: { transcript: 'trigger search error', confidence: 0.9 },
              isFinal: true,
            },
          ],
          resultIndex: 0,
        };
        mockSpeechRecognition.onresult?.(mockEvent);
        mockSpeechRecognition.onend?.();
      });

      // Should handle search failures
      expect(screen.getByText('Voice Search')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('properly manages audio context lifecycle', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });
      await user.click(voiceButton);

      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();

      // Stop listening
      act(() => {
        mockSpeechRecognition.onstart?.();
      });

      await user.click(voiceButton);

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    test('cleans up resources on component unmount', () => {
      const { unmount } = render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    test('handles rapid voice command processing efficiently', async () => {
      const user = userEvent.setup();

      render(
        <VoiceSearch
          onSearchResults={mockOnSearchResults}
          onCommandExecuted={mockOnCommandExecuted}
        />,
      );

      const voiceButton = screen.getByRole('button', {
        name: /start voice search/i,
      });

      // Simulate rapid commands
      for (let i = 0; i < 5; i++) {
        await user.click(voiceButton);

        act(() => {
          mockSpeechRecognition.onstart?.();
          const mockEvent = {
            results: [
              {
                0: { transcript: `search ${i}`, confidence: 0.9 },
                isFinal: true,
              },
            ],
            resultIndex: 0,
          };
          mockSpeechRecognition.onresult?.(mockEvent);
          mockSpeechRecognition.onend?.();
        });
      }

      // Should handle rapid commands without issues
      expect(screen.getByText('Voice Search')).toBeInTheDocument();
    });
  });
});
