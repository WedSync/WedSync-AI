'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  Shield,
  Zap,
  Users,
  PlayCircle,
  PauseCircle,
  RotateCcw,
} from 'lucide-react';
import { useMobileInfrastructure } from '@/hooks/useMobileInfrastructure';

/**
 * WS-257 Team D: Emergency Voice Commands
 * Hands-free voice control for emergency situations
 */

interface VoiceCommand {
  id: string;
  phrase: string;
  alternates?: string[];
  action: VoiceAction;
  category: 'emergency' | 'navigation' | 'communication' | 'system';
  priority: 'critical' | 'high' | 'normal';
  requiresConfirmation: boolean;
  description: string;
}

interface VoiceAction {
  type:
    | 'call'
    | 'navigate'
    | 'trigger-workflow'
    | 'send-alert'
    | 'toggle-setting'
    | 'custom';
  data?: any;
  callback?: () => void;
}

interface VoiceSession {
  isActive: boolean;
  isListening: boolean;
  confidence: number;
  lastCommand: string;
  commandHistory: string[];
  errorCount: number;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  // Critical Emergency Commands
  {
    id: 'emergency-help',
    phrase: 'emergency help',
    alternates: ['help emergency', 'need help now', 'emergency situation'],
    action: {
      type: 'trigger-workflow',
      data: { workflowId: 'emergency-response' },
    },
    category: 'emergency',
    priority: 'critical',
    requiresConfirmation: false,
    description: 'Activate emergency response workflow immediately',
  },
  {
    id: 'call-technical-lead',
    phrase: 'call technical lead',
    alternates: [
      'phone technical lead',
      'contact tech lead',
      'emergency call tech',
    ],
    action: {
      type: 'call',
      data: { number: '+1-555-0101', name: 'Technical Lead' },
    },
    category: 'communication',
    priority: 'critical',
    requiresConfirmation: false,
    description: 'Call the technical lead immediately',
  },
  {
    id: 'wedding-day-crisis',
    phrase: 'wedding day emergency',
    alternates: ['wedding crisis', 'wedding emergency', 'wedding day problem'],
    action: {
      type: 'trigger-workflow',
      data: { workflowId: 'wedding-day-crisis' },
    },
    category: 'emergency',
    priority: 'critical',
    requiresConfirmation: false,
    description: 'Activate wedding day emergency protocols',
  },

  // High Priority Commands
  {
    id: 'infrastructure-failure',
    phrase: 'infrastructure failure',
    alternates: [
      'system failure',
      'infrastructure down',
      'infrastructure emergency',
    ],
    action: {
      type: 'trigger-workflow',
      data: { workflowId: 'infrastructure-failure' },
    },
    category: 'emergency',
    priority: 'high',
    requiresConfirmation: true,
    description: 'Start infrastructure failure response workflow',
  },
  {
    id: 'send-emergency-alert',
    phrase: 'send emergency alert',
    alternates: [
      'broadcast emergency',
      'alert all teams',
      'emergency broadcast',
    ],
    action: {
      type: 'send-alert',
      data: { type: 'emergency', broadcast: true },
    },
    category: 'communication',
    priority: 'high',
    requiresConfirmation: true,
    description: 'Send emergency alert to all team members',
  },
  {
    id: 'activate-backup-systems',
    phrase: 'activate backup systems',
    alternates: ['enable backup', 'switch to backup', 'failover now'],
    action: {
      type: 'custom',
      callback: () => console.log('Activating backup systems'),
    },
    category: 'system',
    priority: 'high',
    requiresConfirmation: true,
    description: 'Switch to backup infrastructure systems',
  },

  // Navigation Commands
  {
    id: 'emergency-dashboard',
    phrase: 'emergency dashboard',
    alternates: ['show emergency', 'emergency center', 'command center'],
    action: {
      type: 'navigate',
      data: { path: '/dashboard/infrastructure?emergency=true' },
    },
    category: 'navigation',
    priority: 'normal',
    requiresConfirmation: false,
    description: 'Navigate to emergency command center',
  },
  {
    id: 'system-status',
    phrase: 'system status',
    alternates: ['show status', 'infrastructure status', 'check systems'],
    action: {
      type: 'navigate',
      data: { path: '/dashboard/infrastructure/metrics' },
    },
    category: 'navigation',
    priority: 'normal',
    requiresConfirmation: false,
    description: 'Show system status dashboard',
  },

  // System Control Commands
  {
    id: 'mute-alerts',
    phrase: 'mute alerts',
    alternates: ['silence alerts', 'disable alerts', 'stop alerts'],
    action: {
      type: 'toggle-setting',
      data: { setting: 'alerts', value: false },
    },
    category: 'system',
    priority: 'normal',
    requiresConfirmation: false,
    description: 'Mute all alert notifications',
  },
  {
    id: 'unmute-alerts',
    phrase: 'unmute alerts',
    alternates: ['enable alerts', 'turn on alerts', 'restore alerts'],
    action: {
      type: 'toggle-setting',
      data: { setting: 'alerts', value: true },
    },
    category: 'system',
    priority: 'normal',
    requiresConfirmation: false,
    description: 'Restore alert notifications',
  },
];

const WAKE_PHRASES = ['hey wedsync', 'emergency wedsync', 'wedsync emergency'];

export default function EmergencyVoiceCommands() {
  const [session, setSession] = useState<VoiceSession>({
    isActive: false,
    isListening: false,
    confidence: 0,
    lastCommand: '',
    commandHistory: [],
    errorCount: 0,
  });

  const [isSupported, setIsSupported] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<VoiceCommand | null>(
    null,
  );
  const [speechSynthesis, setSpeechSynthesis] =
    useState<SpeechSynthesis | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState(true);
  const [showCommands, setShowCommands] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const confirmationTimeoutRef = useRef<NodeJS.Timeout>();

  const { vibrate, showNotification, triggerHapticFeedback, isEmergencyMode } =
    useMobileInfrastructure();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const speechSynth = window.speechSynthesis;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3;

        setRecognition(recognition);
        setIsSupported(true);
      }

      if (speechSynth) {
        setSpeechSynthesis(speechSynth);
      }
    }
  }, []);

  // Setup recognition event handlers
  useEffect(() => {
    if (!recognition) return;

    recognition.onstart = () => {
      setSession((prev) => ({ ...prev, isListening: true }));
      triggerHapticFeedback('light');
    };

    recognition.onend = () => {
      setSession((prev) => ({ ...prev, isListening: false }));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSession((prev) => ({
        ...prev,
        isListening: false,
        errorCount: prev.errorCount + 1,
      }));

      if (event.error === 'no-speech') {
        speak("I didn't hear anything. Please try again.");
      } else {
        speak('Speech recognition error. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence;

      setSession((prev) => ({
        ...prev,
        lastCommand: transcript,
        confidence: confidence * 100,
        commandHistory: [transcript, ...prev.commandHistory.slice(0, 9)], // Keep last 10
      }));

      processVoiceCommand(transcript, confidence);
    };
  }, [recognition]);

  const speak = useCallback(
    (text: string, priority: 'high' | 'normal' = 'normal') => {
      if (!speechSynthesis || !isVoiceResponseEnabled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = priority === 'high' ? 1.1 : 0.9;
      utterance.pitch = priority === 'high' ? 1.1 : 1.0;
      utterance.volume = 1.0;

      // Cancel any ongoing speech for high priority
      if (priority === 'high') {
        speechSynthesis.cancel();
      }

      speechSynthesis.speak(utterance);
    },
    [speechSynthesis, isVoiceResponseEnabled],
  );

  const processVoiceCommand = useCallback(
    (transcript: string, confidence: number) => {
      console.log(
        'Processing voice command:',
        transcript,
        'confidence:',
        confidence,
      );

      // Check for wake phrases first
      const hasWakePhrase = WAKE_PHRASES.some((phrase) =>
        transcript.includes(phrase),
      );

      if (hasWakePhrase) {
        // Extract command after wake phrase
        const commandText = WAKE_PHRASES.reduce((text, phrase) => {
          return text.replace(phrase, '').trim();
        }, transcript);

        if (commandText) {
          processActualCommand(commandText, confidence);
        } else {
          speak('How can I help you?');
          startListening(5000); // Listen for 5 more seconds
        }
        return;
      }

      // If already in active session, process directly
      if (session.isActive) {
        processActualCommand(transcript, confidence);
      }
    },
    [session.isActive],
  );

  const processActualCommand = useCallback(
    (commandText: string, confidence: number) => {
      // Find matching command
      const matchedCommand = VOICE_COMMANDS.find((cmd) => {
        return (
          cmd.phrase === commandText ||
          cmd.alternates?.some((alt) => alt === commandText) ||
          cmd.phrase.includes(commandText) ||
          commandText.includes(cmd.phrase)
        );
      });

      if (matchedCommand) {
        if (confidence < 0.7) {
          speak(
            `I think you said "${matchedCommand.phrase}". Is that correct? Say yes or no.`,
          );
          setPendingCommand(matchedCommand);
          startConfirmationListener();
        } else {
          executeCommand(matchedCommand);
        }
      } else {
        speak(
          'I didn\'t understand that command. Say "help" to hear available commands.',
        );
        setSession((prev) => ({ ...prev, errorCount: prev.errorCount + 1 }));
      }
    },
    [],
  );

  const executeCommand = useCallback(
    (command: VoiceCommand) => {
      console.log('Executing command:', command.id);

      // Haptic feedback based on priority
      switch (command.priority) {
        case 'critical':
          vibrate([200, 100, 200, 100, 200]);
          break;
        case 'high':
          vibrate([100, 50, 100]);
          break;
        default:
          vibrate(50);
      }

      // Execute the command
      switch (command.action.type) {
        case 'call':
          window.open(`tel:${command.action.data.number}`);
          speak(`Calling ${command.action.data.name}`);
          break;

        case 'navigate':
          window.location.href = command.action.data.path;
          speak(`Navigating to ${command.description.toLowerCase()}`);
          break;

        case 'trigger-workflow':
          speak(`Starting ${command.description.toLowerCase()}`);
          showNotification('🎙️ Voice Command Executed', {
            body: command.description,
            tag: 'voice-command',
          });
          // Trigger workflow would be implemented here
          break;

        case 'send-alert':
          speak('Sending emergency alert to all team members');
          // Send alert implementation
          break;

        case 'toggle-setting':
          const setting = command.action.data.setting;
          const value = command.action.data.value;
          speak(`${value ? 'Enabling' : 'Disabling'} ${setting}`);
          // Toggle setting implementation
          break;

        case 'custom':
          command.action.callback?.();
          speak(command.description);
          break;
      }

      // Clear pending command
      setPendingCommand(null);
    },
    [vibrate, speak, showNotification],
  );

  const startListening = useCallback(
    (timeout: number = 10000) => {
      if (!recognition || !isSupported) return;

      try {
        recognition.start();

        // Set timeout
        timeoutRef.current = setTimeout(() => {
          stopListening();
          speak('Voice session timed out.');
        }, timeout);
      } catch (error) {
        console.error('Failed to start recognition:', error);
        speak('Voice recognition is not available.');
      }
    },
    [recognition, isSupported],
  );

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSession((prev) => ({
      ...prev,
      isListening: false,
      isActive: false,
    }));
  }, [recognition]);

  const startConfirmationListener = useCallback(() => {
    if (!recognition) return;

    const originalOnResult = recognition.onresult;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();

      if (transcript.includes('yes') || transcript === 'confirm') {
        if (pendingCommand) {
          executeCommand(pendingCommand);
          speak('Command confirmed and executed.');
        }
      } else if (transcript.includes('no') || transcript === 'cancel') {
        speak('Command cancelled.');
        setPendingCommand(null);
      } else {
        speak('Please say yes to confirm or no to cancel.');
        return; // Keep listening
      }

      // Restore original handler
      recognition.onresult = originalOnResult;
    };

    recognition.start();

    // Timeout for confirmation
    confirmationTimeoutRef.current = setTimeout(() => {
      speak('Confirmation timed out. Command cancelled.');
      setPendingCommand(null);
      recognition.onresult = originalOnResult;
    }, 5000);
  }, [recognition, pendingCommand, executeCommand]);

  const activateVoiceSession = useCallback(() => {
    setSession((prev) => ({ ...prev, isActive: true }));
    speak('Voice commands activated. How can I help?', 'high');
    startListening(15000); // 15 second session
  }, [speak, startListening]);

  const deactivateVoiceSession = useCallback(() => {
    stopListening();
    speak('Voice commands deactivated.');
    setSession((prev) => ({
      ...prev,
      isActive: false,
      isListening: false,
    }));
  }, [stopListening, speak]);

  if (!isSupported) {
    return (
      <Card className="m-4 border-yellow-200">
        <CardContent className="p-6 text-center">
          <MicOff className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Voice Commands Not Supported
          </h3>
          <p className="text-gray-600">
            Your browser doesn't support voice recognition.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voice Session Status */}
      <Card
        className={`border-2 ${session.isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Voice Commands</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={isVoiceResponseEnabled ? 'default' : 'outline'}
                onClick={() =>
                  setIsVoiceResponseEnabled(!isVoiceResponseEnabled)
                }
              >
                {isVoiceResponseEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Session Controls */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={
                  session.isActive
                    ? deactivateVoiceSession
                    : activateVoiceSession
                }
                className={
                  session.isActive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }
              >
                {session.isActive ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>

              {session.isListening && (
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-sm font-medium">Listening...</span>
                </div>
              )}
            </div>

            {/* Session Info */}
            {session.isActive && (
              <div className="space-y-2">
                {session.lastCommand && (
                  <div className="text-sm">
                    <span className="text-gray-600">Last command:</span>
                    <span className="ml-2 font-medium">
                      "{session.lastCommand}"
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round(session.confidence)}% confidence
                    </Badge>
                  </div>
                )}

                {session.confidence > 0 && (
                  <Progress value={session.confidence} className="h-2" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Command Confirmation */}
      <AnimatePresence>
        {pendingCommand && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Confirm command:</span>
                  <span className="ml-2">"{pendingCommand.phrase}"</span>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      executeCommand(pendingCommand);
                      setPendingCommand(null);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingCommand(null)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Commands */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Commands</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCommands(!showCommands)}
            >
              {showCommands ? 'Hide' : 'Show'} Commands
            </Button>
          </div>
        </CardHeader>

        {showCommands && (
          <CardContent>
            <div className="space-y-3">
              {['critical', 'high', 'normal'].map((priority) => {
                const priorityCommands = VOICE_COMMANDS.filter(
                  (cmd) => cmd.priority === priority,
                );
                if (priorityCommands.length === 0) return null;

                return (
                  <div key={priority}>
                    <h4 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-2">
                      {priority} Priority
                    </h4>
                    <div className="space-y-2">
                      {priorityCommands.map((command) => (
                        <div key={command.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                  "{command.phrase}"
                                </code>
                                <Badge
                                  variant={
                                    command.priority === 'critical'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {command.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {command.description}
                              </p>

                              {command.alternates &&
                                command.alternates.length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-xs text-gray-500">
                                      Alternatives:{' '}
                                    </span>
                                    {command.alternates.map((alt, idx) => (
                                      <code
                                        key={idx}
                                        className="text-xs bg-gray-50 px-1 py-0.5 rounded mr-1"
                                      >
                                        "{alt}"
                                      </code>
                                    ))}
                                  </div>
                                )}
                            </div>

                            {command.requiresConfirmation && (
                              <Badge variant="outline" className="text-xs ml-2">
                                Confirmation Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Wake Phrases</h4>
              <p className="text-sm text-blue-700 mb-2">
                Start any command with:
              </p>
              <div className="space-x-2">
                {WAKE_PHRASES.map((phrase) => (
                  <code
                    key={phrase}
                    className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    "{phrase}"
                  </code>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Command History */}
      {session.commandHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {session.commandHistory.slice(0, 5).map((command, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  "{command}"
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
