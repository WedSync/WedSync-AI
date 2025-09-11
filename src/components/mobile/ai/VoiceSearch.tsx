'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MicIcon,
  MicOffIcon,
  PlayIcon,
  PauseIcon,
  VolumeXIcon,
  Volume2Icon,
  SettingsIcon,
  RotateCcwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  MessageSquareIcon,
  HeadphonesIcon,
  BrainIcon,
  ZapIcon,
  WifiOffIcon,
  ActivityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useHapticFeedback,
  PullToRefresh,
  BottomSheet,
} from '@/components/mobile/MobileEnhancedFeatures';

// Types
interface VoiceSearchResult {
  id: string;
  title: string;
  content: string;
  summary: string;
  confidence: number;
  relevanceScore: number;
  category: string;
  readTime: string;
  audioUrl?: string; // For text-to-speech
}

interface VoiceCommand {
  id: string;
  phrase: string;
  action: 'search' | 'navigate' | 'read' | 'bookmark' | 'share' | 'help';
  parameters?: Record<string, any>;
  confidence: number;
}

interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

interface AudioFeedbackConfig {
  enabled: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

interface VoiceSearchProps {
  onSearchResults: (results: VoiceSearchResult[]) => void;
  onCommandExecuted?: (command: VoiceCommand) => void;
  offline?: boolean;
  className?: string;
}

// Voice Commands Dictionary
const VOICE_COMMANDS = {
  search: [
    'search for {query}',
    'find {query}',
    'look for {query}',
    'show me {query}',
    'get {query}',
  ],
  navigate: [
    'go to {section}',
    'navigate to {section}',
    'open {section}',
    'show {section}',
  ],
  read: ['read this', 'read aloud', 'speak this', 'play audio', 'read to me'],
  bookmark: ['bookmark this', 'save this', 'add to favorites', 'remember this'],
  help: ['help', 'what can I say', 'voice commands', 'how do I', 'assistance'],
};

// Advanced Speech Recognition Hook
function useAdvancedSpeechRecognition(config: VoiceRecognitionConfig) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supported =
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return false;
    }

    try {
      // Request microphone permissions
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // Configure recognition
      recognitionRef.current.continuous = config.continuous;
      recognitionRef.current.interimResults = config.interimResults;
      recognitionRef.current.lang = config.language;
      recognitionRef.current.maxAlternatives = config.maxAlternatives;

      // Event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
        setInterimTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          const conf = result[0].confidence;

          if (result.isFinal) {
            finalTranscript += text;
            maxConfidence = Math.max(maxConfidence, conf);
          } else {
            interim += text;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
          setConfidence(maxConfidence);

          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
        }

        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current.onspeechend = () => {
        // Auto-stop after silence
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      };

      recognitionRef.current.start();
      return true;
    } catch (err) {
      setError('Microphone access denied or unavailable');
      return false;
    }
  }, [config, isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  };
}

// Text-to-Speech Hook
function useTextToSpeech(config: AudioFeedbackConfig) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !config.enabled) return;

      // Stop any existing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure voice
      const selectedVoice =
        voices.find(
          (voice) =>
            voice.name.includes(config.voice) ||
            voice.lang.includes(config.voice),
        ) || voices[0];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    },
    [config, voices, isSupported],
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices,
  };
}

export function VoiceSearch({
  onSearchResults,
  onCommandExecuted,
  offline = false,
  className,
}: VoiceSearchProps) {
  const { toast } = useToast();
  const haptic = useHapticFeedback();

  // State
  const [recognitionConfig, setRecognitionConfig] =
    useState<VoiceRecognitionConfig>({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      noiseReduction: true,
      echoCancellation: true,
    });

  const [audioConfig, setAudioConfig] = useState<AudioFeedbackConfig>({
    enabled: true,
    voice: 'en-US',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchResults, setSearchResults] = useState<VoiceSearchResult[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<string | null>(null);

  // Hooks
  const speech = useAdvancedSpeechRecognition(recognitionConfig);
  const tts = useTextToSpeech(audioConfig);

  // Voice activity detection
  const [voiceActivity, setVoiceActivity] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize voice activity detection
  const initVoiceActivityDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;

      const detectActivity = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setVoiceActivity(Math.min(100, average));

        if (speech.isListening) {
          requestAnimationFrame(detectActivity);
        }
      };

      detectActivity();
    } catch (error) {
      console.error('Voice activity detection failed:', error);
    }
  }, [speech.isListening]);

  // Process voice commands
  const processVoiceCommand = useCallback(
    async (transcript: string) => {
      setIsProcessing(true);

      try {
        // Analyze transcript for commands
        const command = analyzeVoiceCommand(transcript);

        if (command) {
          setLastCommand(command);

          switch (command.action) {
            case 'search':
              await handleVoiceSearch(command.parameters?.query || transcript);
              break;
            case 'read':
              await handleReadAloud();
              break;
            case 'navigate':
              await handleNavigation(command.parameters?.section);
              break;
            case 'bookmark':
              await handleBookmark();
              break;
            case 'help':
              await handleHelp();
              break;
            default:
              // Default to search if no specific command detected
              await handleVoiceSearch(transcript);
          }

          onCommandExecuted?.(command);
        } else {
          await handleVoiceSearch(transcript);
        }
      } catch (error) {
        console.error('Command processing failed:', error);
        tts.speak('Sorry, I could not process that command. Please try again.');
        haptic.error();
      } finally {
        setIsProcessing(false);
      }
    },
    [onCommandExecuted, haptic, tts],
  );

  // Analyze voice command
  const analyzeVoiceCommand = useCallback(
    (transcript: string): VoiceCommand | null => {
      const lowerTranscript = transcript.toLowerCase().trim();

      for (const [action, patterns] of Object.entries(VOICE_COMMANDS)) {
        for (const pattern of patterns) {
          const regex = new RegExp(
            pattern.replace('{query}', '(.+)').replace('{section}', '(.+)'),
            'i',
          );
          const match = lowerTranscript.match(regex);

          if (match) {
            return {
              id: `cmd_${Date.now()}`,
              phrase: transcript,
              action: action as VoiceCommand['action'],
              parameters: match[1]
                ? { query: match[1], section: match[1] }
                : undefined,
              confidence: 0.9,
            };
          }
        }
      }

      return null;
    },
    [],
  );

  // Handle voice search
  const handleVoiceSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      haptic.medium();
      tts.speak(`Searching for ${query}`);

      try {
        // Mock search API call - replace with actual search
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockResults: VoiceSearchResult[] = [
          {
            id: '1',
            title: 'Wedding Timeline Planning Guide',
            content: 'Complete guide to planning wedding day timelines...',
            summary:
              'Learn how to create perfect wedding timelines that keep everyone on schedule.',
            confidence: 0.95,
            relevanceScore: 0.92,
            category: 'Planning',
            readTime: '5 min read',
          },
          {
            id: '2',
            title: 'Client Communication Best Practices',
            content:
              'Professional communication strategies for wedding vendors...',
            summary:
              'Master the art of client communication for wedding photography business.',
            confidence: 0.87,
            relevanceScore: 0.85,
            category: 'Business',
            readTime: '8 min read',
          },
        ];

        setSearchResults(mockResults);
        onSearchResults(mockResults);

        const resultCount = mockResults.length;
        tts.speak(
          `Found ${resultCount} result${resultCount !== 1 ? 's' : ''} for ${query}. Say "read first result" to hear the top match, or "show results" to see all options.`,
        );

        haptic.success();
      } catch (error) {
        console.error('Search failed:', error);
        tts.speak(
          'Sorry, the search failed. Please check your connection and try again.',
        );
        haptic.error();
      }
    },
    [onSearchResults, haptic, tts],
  );

  // Handle read aloud
  const handleReadAloud = useCallback(async () => {
    if (searchResults.length === 0) {
      tts.speak(
        'No search results to read. Please search for something first.',
      );
      return;
    }

    const firstResult = searchResults[0];
    setCurrentlyReading(firstResult.id);

    const textToRead = `${firstResult.title}. ${firstResult.summary}. This is a ${firstResult.readTime} article in the ${firstResult.category} category.`;

    tts.speak(textToRead);
    haptic.light();
  }, [searchResults, tts, haptic]);

  // Handle navigation
  const handleNavigation = useCallback(
    async (section?: string) => {
      if (section) {
        tts.speak(`Navigating to ${section}`);
        haptic.light();
        // Implement navigation logic
      } else {
        tts.speak('Please specify where you would like to navigate to.');
      }
    },
    [tts, haptic],
  );

  // Handle bookmark
  const handleBookmark = useCallback(async () => {
    if (searchResults.length === 0) {
      tts.speak(
        'No article to bookmark. Please search and select an article first.',
      );
      return;
    }

    const firstResult = searchResults[0];
    tts.speak(`Bookmarked: ${firstResult.title}`);
    haptic.medium();

    toast({
      title: 'Article bookmarked',
      description: firstResult.title,
    });
  }, [searchResults, tts, haptic, toast]);

  // Handle help
  const handleHelp = useCallback(async () => {
    const helpText = `
      Here are some things you can say:
      "Search for wedding timeline"
      "Find client communication tips"  
      "Read this article"
      "Bookmark this"
      "Navigate to planning section"
      "Help me with"
      
      You can also just speak naturally, and I'll try to understand what you need.
    `;

    tts.speak(helpText);
    haptic.light();
  }, [tts, haptic]);

  // Effect to process completed speech
  useEffect(() => {
    if (
      speech.transcript &&
      speech.confidence > 0.6 &&
      !speech.isListening &&
      !isProcessing
    ) {
      processVoiceCommand(speech.transcript);
      speech.clearTranscript();
    }
  }, [
    speech.transcript,
    speech.confidence,
    speech.isListening,
    isProcessing,
    processVoiceCommand,
    speech,
  ]);

  // Start listening with activity detection
  const startVoiceSearch = useCallback(async () => {
    const started = await speech.startListening();
    if (started) {
      await initVoiceActivityDetection();
      haptic.medium();
      tts.speak('Listening... What can I help you find?');
    }
  }, [speech, initVoiceActivityDetection, haptic, tts]);

  // Stop listening
  const stopVoiceSearch = useCallback(() => {
    speech.stopListening();

    // Cleanup voice activity detection
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setVoiceActivity(0);
    haptic.light();
  }, [speech, haptic]);

  const TOUCH_TARGET_SIZE = 48;

  return (
    <div className={cn('voice-search bg-white', className)}>
      <PullToRefresh onRefresh={() => {}} disabled={speech.isListening}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                  <BrainIcon className="w-6 h-6 text-blue-600 mr-2" />
                  Voice Search
                </h1>
                <p className="text-sm text-gray-600">
                  {offline ? (
                    <span className="flex items-center">
                      <WifiOffIcon className="w-4 h-4 mr-1 text-red-500" />
                      Offline Mode - Limited features
                    </span>
                  ) : (
                    'Ask questions or search by voice'
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  'p-2 rounded-lg bg-gray-100 transition-all active:scale-95',
                  `min-w-[${TOUCH_TARGET_SIZE}px] min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              >
                <SettingsIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Voice Status Indicators */}
            {!speech.isSupported ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center">
                  <AlertCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">
                    Voice recognition is not supported in this browser
                  </p>
                </div>
              </div>
            ) : speech.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center">
                  <AlertCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">Error: {speech.error}</p>
                </div>
              </div>
            ) : speech.isListening ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MicIcon className="w-5 h-5 text-blue-600 mr-2 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Listening...
                      </p>
                      <p className="text-xs text-blue-600">
                        Speak naturally or give a command
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <ActivityIcon className="w-4 h-4 text-blue-600" />
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${voiceActivity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <div className="flex items-center">
                  <ZapIcon className="w-5 h-5 text-yellow-600 mr-2 animate-spin" />
                  <p className="text-sm text-yellow-800">
                    Processing your request...
                  </p>
                </div>
              </div>
            ) : null}

            {/* Live Transcript */}
            {(speech.transcript || speech.interimTranscript) && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-1">You said:</p>
                <p className="text-gray-900">
                  {speech.transcript}
                  <span className="text-gray-400 italic">
                    {speech.interimTranscript}
                  </span>
                </p>
                {speech.confidence > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round(speech.confidence * 100)}%
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Voice Control Button */}
          <div className="text-center mb-8">
            <button
              onClick={speech.isListening ? stopVoiceSearch : startVoiceSearch}
              disabled={!speech.isSupported || isProcessing}
              className={cn(
                'w-24 h-24 rounded-full transition-all active:scale-95',
                'flex items-center justify-center shadow-lg',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                speech.isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600',
              )}
            >
              {speech.isListening ? (
                <MicOffIcon className="w-10 h-10" />
              ) : (
                <MicIcon className="w-10 h-10" />
              )}
            </button>

            <p className="text-sm text-gray-600 mt-4">
              {speech.isListening
                ? 'Tap to stop listening'
                : 'Tap to start voice search'}
            </p>
          </div>

          {/* Last Command */}
          {lastCommand && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Last Command</h3>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {lastCommand.action.charAt(0).toUpperCase() +
                        lastCommand.action.slice(1)}
                    </p>
                    <p className="text-xs text-green-600">
                      "{lastCommand.phrase}"
                    </p>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <div className="flex items-center space-x-2">
                  {tts.isSpeaking && currentlyReading && (
                    <button
                      onClick={tts.stop}
                      className="p-2 bg-red-100 text-red-600 rounded-lg"
                    >
                      <PauseIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={audioConfig.enabled ? () => {} : () => {}}
                    className={cn(
                      'p-2 rounded-lg transition-all active:scale-95',
                      audioConfig.enabled
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {audioConfig.enabled ? (
                      <Volume2Icon className="w-4 h-4" />
                    ) : (
                      <VolumeXIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={cn(
                      'p-4 border rounded-lg transition-all',
                      currentlyReading === result.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {result.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {result.summary}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span>{result.category}</span>
                          <span>{result.readTime}</span>
                          <span>
                            Confidence: {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => {
                            setCurrentlyReading(result.id);
                            tts.speak(`${result.title}. ${result.summary}`);
                          }}
                          className={cn(
                            'p-2 rounded-lg transition-all active:scale-95',
                            currentlyReading === result.id && tts.isSpeaking
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600',
                          )}
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            toast({
                              title: 'Article opened',
                              description: result.title,
                            });
                            haptic.light();
                          }}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg transition-all active:scale-95"
                        >
                          <MessageSquareIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Commands Help */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Voice Commands</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  command: 'Search for wedding timeline',
                  description: 'Find articles about specific topics',
                },
                {
                  command: 'Read this article',
                  description: 'Have the current article read aloud',
                },
                {
                  command: 'Bookmark this',
                  description: 'Save the current article',
                },
                {
                  command: 'Help me with...',
                  description: 'Get assistance with specific tasks',
                },
                {
                  command: 'Navigate to planning',
                  description: 'Go to a specific section',
                },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 text-sm">
                    "{item.command}"
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Bottom Sheet */}
        <BottomSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          snapPoints={[0.7, 0.95]}
        >
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Voice Settings</h2>

            <div className="space-y-6">
              {/* Audio Feedback */}
              <div>
                <h3 className="font-medium mb-3">Audio Feedback</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable voice responses</span>
                    <button
                      onClick={() =>
                        setAudioConfig((prev) => ({
                          ...prev,
                          enabled: !prev.enabled,
                        }))
                      }
                      className={cn(
                        'w-12 h-6 rounded-full transition-all',
                        audioConfig.enabled ? 'bg-blue-500' : 'bg-gray-300',
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 bg-white rounded-full shadow-sm transition-all',
                          audioConfig.enabled
                            ? 'translate-x-6'
                            : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>

                  {audioConfig.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Speech Rate
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={audioConfig.rate}
                          onChange={(e) =>
                            setAudioConfig((prev) => ({
                              ...prev,
                              rate: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Current: {audioConfig.rate}x speed
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Volume
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={audioConfig.volume}
                          onChange={(e) =>
                            setAudioConfig((prev) => ({
                              ...prev,
                              volume: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Current: {Math.round(audioConfig.volume * 100)}%
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recognition Settings */}
              <div>
                <h3 className="font-medium mb-3">Recognition Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Language
                    </label>
                    <select
                      value={recognitionConfig.language}
                      onChange={(e) =>
                        setRecognitionConfig((prev) => ({
                          ...prev,
                          language: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="en-AU">English (Australia)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Continuous listening</span>
                    <button
                      onClick={() =>
                        setRecognitionConfig((prev) => ({
                          ...prev,
                          continuous: !prev.continuous,
                        }))
                      }
                      className={cn(
                        'w-12 h-6 rounded-full transition-all',
                        recognitionConfig.continuous
                          ? 'bg-blue-500'
                          : 'bg-gray-300',
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 bg-white rounded-full shadow-sm transition-all',
                          recognitionConfig.continuous
                            ? 'translate-x-6'
                            : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Noise reduction</span>
                    <button
                      onClick={() =>
                        setRecognitionConfig((prev) => ({
                          ...prev,
                          noiseReduction: !prev.noiseReduction,
                        }))
                      }
                      className={cn(
                        'w-12 h-6 rounded-full transition-all',
                        recognitionConfig.noiseReduction
                          ? 'bg-blue-500'
                          : 'bg-gray-300',
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 bg-white rounded-full shadow-sm transition-all',
                          recognitionConfig.noiseReduction
                            ? 'translate-x-6'
                            : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Voice Features */}
              <div>
                <h3 className="font-medium mb-3">Test Voice Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      tts.speak(
                        'This is a test of the text to speech system. It sounds great!',
                      )
                    }
                    disabled={!tts.isSupported || tts.isSpeaking}
                    className={cn(
                      'p-3 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium',
                      'transition-all active:scale-95 disabled:opacity-50',
                      `min-h-[${TOUCH_TARGET_SIZE}px]`,
                    )}
                  >
                    <HeadphonesIcon className="w-5 h-5 mx-auto mb-1" />
                    Test Speech
                  </button>

                  <button
                    onClick={
                      speech.isListening ? stopVoiceSearch : startVoiceSearch
                    }
                    disabled={!speech.isSupported}
                    className={cn(
                      'p-3 rounded-lg text-sm font-medium transition-all active:scale-95',
                      'disabled:opacity-50',
                      speech.isListening
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600',
                      `min-h-[${TOUCH_TARGET_SIZE}px]`,
                    )}
                  >
                    <MicIcon className="w-5 h-5 mx-auto mb-1" />
                    Test Mic
                  </button>
                </div>
              </div>

              {/* Reset Settings */}
              <button
                onClick={() => {
                  setRecognitionConfig({
                    language: 'en-US',
                    continuous: true,
                    interimResults: true,
                    maxAlternatives: 3,
                    noiseReduction: true,
                    echoCancellation: true,
                  });
                  setAudioConfig({
                    enabled: true,
                    voice: 'en-US',
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 0.8,
                  });
                  haptic.medium();
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                <RotateCcwIcon className="w-5 h-5 inline mr-2" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </BottomSheet>
      </PullToRefresh>
    </div>
  );
}
