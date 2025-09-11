'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Save,
  Download,
  Wifi,
  WifiOff,
  Heart,
  Calendar,
  MapPin,
  Users,
  Camera,
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Journey node representing a step in the wedding planning journey
 */
interface JourneyNode {
  id: string;
  title: string;
  description: string;
  timeline: string;
  category:
    | 'venue'
    | 'catering'
    | 'photography'
    | 'flowers'
    | 'music'
    | 'planning';
  priority: 'high' | 'medium' | 'low';
  estimatedCost?: number;
  suggestedVendors: Vendor[];
  tasks: Task[];
  completed: boolean;
  dueDate?: Date;
  notes?: string;
}

/**
 * Vendor suggestion with rating and contact info
 */
interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  avatar?: string;
  location: string;
  specialty: string;
  responseTime: string;
  available: boolean;
}

/**
 * Task within a journey node
 */
interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  assignedTo?: string;
}

/**
 * AI generation state
 */
interface AIGenerationState {
  isGenerating: boolean;
  stage: 'analyzing' | 'creating' | 'optimizing' | 'finalizing' | 'complete';
  progress: number;
  currentStep: string;
}

/**
 * Props for the MobileJourneyAI component
 */
interface MobileJourneyAIProps {
  weddingId: string;
  onJourneySave: (journey: JourneyNode[]) => Promise<void>;
  onVendorSelect: (vendor: Vendor, nodeId: string) => void;
  existingJourney?: JourneyNode[];
  className?: string;
}

/**
 * Voice recognition hook for mobile voice input
 */
const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice recognition failed. Please try again.');
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition.current && !isListening) {
      try {
        recognition.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        toast.error('Voice input not available');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognition.current && isListening) {
      recognition.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
  };
};

/**
 * Offline storage hook for journey data
 */
const useOfflineJourney = (weddingId: string) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOffline = useCallback(
    async (journey: JourneyNode[]) => {
      try {
        const offlineKey = `journey_${weddingId}_offline`;
        localStorage.setItem(
          offlineKey,
          JSON.stringify({
            journey,
            timestamp: Date.now(),
            version: 1,
          }),
        );
        toast.success('Journey saved offline');
      } catch (error) {
        console.error('Failed to save journey offline:', error);
        toast.error('Failed to save journey offline');
      }
    },
    [weddingId],
  );

  const loadOffline = useCallback((): JourneyNode[] | null => {
    try {
      const offlineKey = `journey_${weddingId}_offline`;
      const stored = localStorage.getItem(offlineKey);
      if (stored) {
        const { journey } = JSON.parse(stored);
        return journey;
      }
    } catch (error) {
      console.error('Failed to load offline journey:', error);
    }
    return null;
  }, [weddingId]);

  return { isOffline, saveOffline, loadOffline };
};

/**
 * Mobile Journey AI Interface Component
 * Provides touch-optimized journey creation with AI assistance
 */
export const MobileJourneyAI: React.FC<MobileJourneyAIProps> = ({
  weddingId,
  onJourneySave,
  onVendorSelect,
  existingJourney = [],
  className,
}) => {
  // State management
  const [journey, setJourney] = useState<JourneyNode[]>(existingJourney);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [aiState, setAiState] = useState<AIGenerationState>({
    isGenerating: false,
    stage: 'analyzing',
    progress: 0,
    currentStep: 'Ready to generate your perfect wedding journey',
  });
  const [prompt, setPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<
    Record<string, Vendor>
  >({});

  // Hooks
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceRecognition();
  const { isOffline, saveOffline, loadOffline } = useOfflineJourney(weddingId);

  // Load offline data on mount
  useEffect(() => {
    if (existingJourney.length === 0) {
      const offlineJourney = loadOffline();
      if (offlineJourney) {
        setJourney(offlineJourney);
        toast.info('Loaded offline journey');
      }
    }
  }, [existingJourney, loadOffline]);

  // Auto-save offline
  useEffect(() => {
    if (journey.length > 0) {
      saveOffline(journey);
    }
  }, [journey, saveOffline]);

  // Current node for easier access
  const currentNode = useMemo(
    () => journey[currentNodeIndex],
    [journey, currentNodeIndex],
  );

  /**
   * Swipe handlers for node navigation
   */
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentNodeIndex < journey.length - 1) {
        setCurrentNodeIndex((prev) => prev + 1);
      }
    },
    onSwipedRight: () => {
      if (currentNodeIndex > 0) {
        setCurrentNodeIndex((prev) => prev - 1);
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  /**
   * Generate AI journey based on user input
   */
  const generateAIJourney = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim()) {
      toast.error('Please provide details about your wedding vision');
      return;
    }

    setAiState({
      isGenerating: true,
      stage: 'analyzing',
      progress: 10,
      currentStep: 'Analyzing your wedding vision...',
    });

    try {
      // Simulate AI generation stages with realistic timing
      const stages = [
        {
          stage: 'analyzing',
          progress: 25,
          step: 'Understanding your style preferences...',
        },
        {
          stage: 'creating',
          progress: 50,
          step: 'Creating personalized journey steps...',
        },
        {
          stage: 'optimizing',
          progress: 75,
          step: 'Matching with perfect vendors...',
        },
        {
          stage: 'finalizing',
          progress: 90,
          step: 'Finalizing your wedding roadmap...',
        },
      ] as const;

      for (const { stage, progress, step } of stages) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setAiState((prev) => ({ ...prev, stage, progress, currentStep: step }));
      }

      // Mock AI-generated journey - in production this would call your AI API
      const mockJourney: JourneyNode[] = [
        {
          id: '1',
          title: 'Secure Your Dream Venue',
          description:
            'Find and book the perfect location for your special day',
          timeline: '8-12 months before',
          category: 'venue',
          priority: 'high',
          estimatedCost: 8000,
          completed: false,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          suggestedVendors: [
            {
              id: 'v1',
              name: 'Elegant Garden Estate',
              category: 'Venue',
              rating: 4.9,
              reviewCount: 127,
              priceRange: '£8,000-£12,000',
              location: 'Surrey',
              specialty: 'Garden ceremonies',
              responseTime: '< 2 hours',
              available: true,
            },
            {
              id: 'v2',
              name: 'Historic Manor House',
              category: 'Venue',
              rating: 4.8,
              reviewCount: 89,
              priceRange: '£6,000-£10,000',
              location: 'Kent',
              specialty: 'Historic elegance',
              responseTime: '< 4 hours',
              available: true,
            },
          ],
          tasks: [
            { id: 't1', title: 'Visit top 3 venues', completed: false },
            {
              id: 't2',
              title: 'Check availability for preferred dates',
              completed: false,
            },
            { id: 't3', title: 'Review contracts and terms', completed: false },
          ],
        },
        {
          id: '2',
          title: 'Capture Perfect Moments',
          description: 'Book a photographer who matches your style',
          timeline: '6-9 months before',
          category: 'photography',
          priority: 'high',
          estimatedCost: 2500,
          completed: false,
          suggestedVendors: [
            {
              id: 'v3',
              name: 'Sarah Mitchell Photography',
              category: 'Photography',
              rating: 5.0,
              reviewCount: 156,
              priceRange: '£2,200-£3,500',
              location: 'London',
              specialty: 'Natural light portraits',
              responseTime: '< 1 hour',
              available: true,
            },
          ],
          tasks: [
            { id: 't4', title: 'Review portfolio styles', completed: false },
            {
              id: 't5',
              title: 'Schedule engagement session',
              completed: false,
            },
          ],
        },
      ];

      setJourney(mockJourney);
      setCurrentNodeIndex(0);

      setAiState({
        isGenerating: false,
        stage: 'complete',
        progress: 100,
        currentStep: 'Your personalized journey is ready! 🎉',
      });

      toast.success('AI journey generated successfully!');
    } catch (error) {
      console.error('AI generation failed:', error);
      setAiState({
        isGenerating: false,
        stage: 'analyzing',
        progress: 0,
        currentStep: 'Generation failed. Please try again.',
      });
      toast.error('Failed to generate journey. Please try again.');
    }
  }, []);

  /**
   * Handle input submission (text or voice)
   */
  const handleSubmitPrompt = useCallback(async () => {
    const inputText = prompt || transcript;
    if (!inputText.trim()) return;

    await generateAIJourney(inputText);
    setPrompt('');
    clearTranscript();
  }, [prompt, transcript, generateAIJourney, clearTranscript]);

  /**
   * Save journey (online or offline)
   */
  const handleSaveJourney = useCallback(async () => {
    try {
      if (!isOffline) {
        await onJourneySave(journey);
        toast.success('Journey saved successfully!');
      } else {
        await saveOffline(journey);
        toast.success('Journey saved offline - will sync when online');
      }
    } catch (error) {
      console.error('Failed to save journey:', error);
      toast.error('Failed to save journey');
    }
  }, [journey, isOffline, onJourneySave, saveOffline]);

  /**
   * Select vendor for current node
   */
  const handleVendorSelect = useCallback(
    (vendor: Vendor) => {
      if (!currentNode) return;

      setSelectedVendors((prev) => ({
        ...prev,
        [currentNode.id]: vendor,
      }));

      onVendorSelect(vendor, currentNode.id);
      toast.success(`${vendor.name} selected for ${currentNode.title}`);
    },
    [currentNode, onVendorSelect],
  );

  /**
   * Get category icon
   */
  const getCategoryIcon = useCallback((category: string) => {
    const icons = {
      venue: MapPin,
      photography: Camera,
      catering: Users,
      flowers: Heart,
      music: Heart,
      planning: Calendar,
    };
    const Icon = icons[category as keyof typeof icons] || Heart;
    return <Icon className="w-5 h-5" />;
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800',
        className,
      )}
    >
      {/* Header with offline indicator */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-rose-500" />
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              Journey AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {journey.length} steps •{' '}
              {journey.filter((n) => n.completed).length} complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* AI Input Section */}
      <div className="p-4 space-y-4">
        <Card className="border-2 border-dashed border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20">
          <CardContent className="p-4 space-y-4">
            {aiState.isGenerating ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Sparkles className="w-6 h-6 text-rose-500 animate-pulse" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-rose-500 rounded-full animate-ping opacity-20" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {aiState.currentStep}
                    </p>
                    <Progress value={aiState.progress} className="mt-2 h-2" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Textarea
                      placeholder="Describe your dream wedding... (e.g., 'Rustic outdoor wedding for 120 guests in Surrey with garden party vibes')"
                      value={prompt || transcript}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px] pr-12 text-base"
                      disabled={aiState.isGenerating}
                    />
                    {transcript && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        Voice
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isListening ? stopListening : startListening}
                      className="flex items-center gap-2"
                      disabled={aiState.isGenerating}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 text-red-500" />
                          <span className="animate-pulse">Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          Voice
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleSubmitPrompt}
                      disabled={
                        aiState.isGenerating ||
                        (!prompt.trim() && !transcript.trim())
                      }
                      className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    >
                      <Send className="w-4 h-4" />
                      Generate Journey
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Journey Nodes */}
      {journey.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Wedding Journey
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentNodeIndex(Math.max(0, currentNodeIndex - 1))
                  }
                  disabled={currentNodeIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Badge variant="outline">
                  {currentNodeIndex + 1} / {journey.length}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentNodeIndex(
                      Math.min(journey.length - 1, currentNodeIndex + 1),
                    )
                  }
                  disabled={currentNodeIndex === journey.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            {...swipeHandlers}
            className="px-4 pb-4 h-full overflow-y-auto touch-pan-y"
          >
            <AnimatePresence mode="wait">
              {currentNode && (
                <motion.div
                  key={currentNode.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  {/* Node Header */}
                  <Card className="border-l-4 border-l-rose-500">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/20">
                            {getCategoryIcon(currentNode.category)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {currentNode.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {currentNode.timeline}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            currentNode.priority === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {currentNode.priority}
                        </Badge>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300">
                        {currentNode.description}
                      </p>

                      {currentNode.estimatedCost && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Estimated cost
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            £{currentNode.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tasks */}
                  {currentNode.tasks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-rose-500" />
                        Tasks
                      </h4>
                      <div className="space-y-2">
                        {currentNode.tasks.map((task) => (
                          <Card
                            key={task.id}
                            className="border border-gray-200 dark:border-gray-700"
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={(e) => {
                                    const updatedJourney = journey.map(
                                      (node) =>
                                        node.id === currentNode.id
                                          ? {
                                              ...node,
                                              tasks: node.tasks.map((t) =>
                                                t.id === task.id
                                                  ? {
                                                      ...t,
                                                      completed:
                                                        e.target.checked,
                                                    }
                                                  : t,
                                              ),
                                            }
                                          : node,
                                    );
                                    setJourney(updatedJourney);
                                  }}
                                  className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-500"
                                />
                                <span
                                  className={cn(
                                    'text-sm',
                                    task.completed
                                      ? 'line-through text-gray-500 dark:text-gray-400'
                                      : 'text-gray-900 dark:text-white',
                                  )}
                                >
                                  {task.title}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {journey.length > 0 && (
        <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveJourney}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Journey
            </Button>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {journey.length === 0 && !aiState.isGenerating && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Create Your Wedding Journey
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tell us about your dream wedding and we'll create a personalized
                step-by-step journey with vendor recommendations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileJourneyAI;
