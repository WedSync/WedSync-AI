'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCwIcon,
  MicIcon,
  MicOffIcon,
  ZapIcon,
  MailIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VolumeXIcon,
  Volume2Icon,
  SettingsIcon,
  SendIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useHapticFeedback,
  PullToRefresh,
  BottomSheet,
  SwipeableCard,
} from '@/components/mobile/MobileEnhancedFeatures';
import { TouchOptimizedVariantSelector } from './TouchOptimizedVariantSelector';
import { MobileAIEmailOptimizer } from '@/lib/mobile/ai-email-optimization';

// Types
interface ClientContext {
  name: string;
  weddingDate?: string;
  venue?: string;
  inquiryType: 'booking' | 'follow-up' | 'confirmation' | 'general';
  personalNotes?: string;
  urgency: 'low' | 'medium' | 'high';
}

interface EmailTemplate {
  id: string;
  subject: string;
  content: string;
  tone: 'professional' | 'friendly' | 'warm' | 'urgent';
  stage: 'inquiry' | 'booking' | 'pre-wedding' | 'post-wedding';
  confidence: number;
  wordCount: number;
  estimatedReadTime: string;
}

interface MobileEmailTemplateGeneratorProps {
  onTemplatesGenerated: (templates: EmailTemplate[]) => void;
  clientContext?: Partial<ClientContext>;
  className?: string;
}

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  confidence: number;
}

// Screen orientation hook for mobile
function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait',
  );

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      );
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

// Voice recognition hook for mobile input
function useVoiceRecognition() {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    confidence: 0,
  });

  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setState((prev) => ({ ...prev, isListening: true }));
    };

    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
          confidence = event.results[i][0].confidence;
        }
      }

      setState((prev) => ({ ...prev, transcript, confidence }));
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current.onend = () => {
      setState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', confidence: 0 }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    isSupported:
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
  };
}

export function MobileEmailTemplateGenerator({
  onTemplatesGenerated,
  clientContext = {},
  className,
}: MobileEmailTemplateGeneratorProps) {
  const orientation = useOrientation();
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  const voice = useVoiceRecognition();

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [context, setContext] = useState<ClientContext>({
    name: '',
    inquiryType: 'general',
    urgency: 'medium',
    ...clientContext,
  });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [generatedTemplates, setGeneratedTemplates] = useState<EmailTemplate[]>(
    [],
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs for touch optimization
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const refreshKeyRef = useRef(0);

  // Touch target size optimization
  const TOUCH_TARGET_SIZE = 48; // iOS minimum 44px, Android 48dp

  // Form field update handler with haptic feedback
  const updateContext = useCallback(
    (updates: Partial<ClientContext>) => {
      haptic.light();
      setContext((prev) => ({ ...prev, ...updates }));
    },
    [haptic],
  );

  // Voice input integration
  useEffect(() => {
    if (voice.transcript && voice.confidence > 0.7) {
      // Parse voice input for client details
      const transcript = voice.transcript.toLowerCase();

      if (transcript.includes('wedding') && transcript.includes('date')) {
        // Extract potential dates
        const dateMatch = transcript.match(
          /(\w+ \d{1,2}|\d{1,2} \w+|\d{1,2}\/\d{1,2}\/\d{4})/,
        );
        if (dateMatch) {
          updateContext({ weddingDate: dateMatch[0] });
        }
      }

      if (transcript.includes('name is') || transcript.includes('called')) {
        const nameMatch = transcript.match(/(?:name is|called) (\w+)/);
        if (nameMatch) {
          updateContext({ name: nameMatch[1] });
        }
      }

      // Auto-detect urgency from voice tone/keywords
      if (transcript.includes('urgent') || transcript.includes('asap')) {
        updateContext({ urgency: 'high' });
      }
    }
  }, [voice.transcript, voice.confidence, updateContext]);

  // AI template generation with mobile optimization
  const generateTemplates = useCallback(async () => {
    if (!context.name.trim()) {
      toast({
        title: 'Client name required',
        description: "Please enter the client's name",
        variant: 'destructive',
      });
      haptic.error();
      return;
    }

    setIsGenerating(true);
    haptic.medium();

    try {
      const optimizer = new MobileAIEmailOptimizer();
      const templates = await optimizer.generateMobileOptimizedTemplates({
        clientContext: context,
        maxVariants: 3, // Optimized for mobile
        mobileOptimized: true,
        touchFriendly: true,
      });

      setGeneratedTemplates(templates);
      onTemplatesGenerated(templates);

      haptic.success();
      toast({ title: `Generated ${templates.length} templates!` });
    } catch (error) {
      console.error('Template generation failed:', error);
      haptic.error();
      toast({
        title: 'Generation failed',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [context, onTemplatesGenerated, toast, haptic]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshKeyRef.current += 1;
    await generateTemplates();
  }, [generateTemplates]);

  // Section collapse toggle
  const toggleSection = useCallback(
    (sectionId: string) => {
      haptic.light();
      setCollapsedSections((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
        } else {
          newSet.add(sectionId);
        }
        return newSet;
      });
    },
    [haptic],
  );

  // Quick context presets for common scenarios
  const quickPresets = [
    {
      label: '📞 Inquiry Response',
      context: { inquiryType: 'booking' as const, urgency: 'medium' as const },
    },
    {
      label: '✅ Booking Confirmation',
      context: {
        inquiryType: 'confirmation' as const,
        urgency: 'high' as const,
      },
    },
    {
      label: '💌 Follow-up',
      context: { inquiryType: 'follow-up' as const, urgency: 'low' as const },
    },
  ];

  const renderFormField = (
    label: string,
    children: React.ReactNode,
    sectionId: string,
    required: boolean = false,
  ) => {
    const isCollapsed = collapsedSections.has(sectionId);

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleSection(sectionId)}
          className={cn(
            'w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border',
            'transition-all duration-200 active:scale-95',
            `min-h-[${TOUCH_TARGET_SIZE}px]`,
          )}
        >
          <span className={cn('font-medium', required && 'text-red-600')}>
            {label} {required && '*'}
          </span>
          {isCollapsed ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {!isCollapsed && <div className="mt-2 space-y-3">{children}</div>}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'mobile-ai-generator bg-white min-h-screen',
        orientation === 'landscape' && 'landscape-mode',
        className,
      )}
    >
      <PullToRefresh
        onRefresh={handleRefresh}
        disabled={isGenerating}
        className="h-full"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                AI Email Templates
              </h1>
              <p className="text-sm text-gray-600">
                Mobile-optimized for wedding photographers
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

          {/* Quick Presets - Horizontal scroll */}
          <div className="px-4 pb-4">
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {quickPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    updateContext(preset.context);
                    haptic.light();
                  }}
                  className={cn(
                    'flex-shrink-0 px-4 py-2 bg-blue-50 text-blue-600 rounded-full',
                    'text-sm font-medium whitespace-nowrap transition-all active:scale-95',
                    `min-h-[${TOUCH_TARGET_SIZE - 8}px]`,
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4 space-y-4 pb-24">
          {/* Client Name - Always visible and required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={context.name}
                onChange={(e) => updateContext({ name: e.target.value })}
                placeholder="Enter client's name..."
                className={cn(
                  'w-full px-4 py-3 border border-gray-300 rounded-lg',
                  'text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              />
              {voice.isSupported && (
                <button
                  onClick={
                    voice.isListening
                      ? voice.stopListening
                      : voice.startListening
                  }
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full',
                    'transition-all active:scale-95',
                    voice.isListening
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600',
                    `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
                  )}
                >
                  {voice.isListening ? (
                    <MicIcon className="w-5 h-5" />
                  ) : (
                    <MicOffIcon className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Voice Transcript Display */}
          {voice.transcript && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Voice input:</span>{' '}
                {voice.transcript}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Confidence: {Math.round(voice.confidence * 100)}%
              </p>
            </div>
          )}

          {/* Collapsible Form Sections */}
          {renderFormField(
            'Inquiry Type',
            <select
              value={context.inquiryType}
              onChange={(e) =>
                updateContext({
                  inquiryType: e.target.value as ClientContext['inquiryType'],
                })
              }
              className={cn(
                'w-full px-4 py-3 border border-gray-300 rounded-lg text-lg',
                `min-h-[${TOUCH_TARGET_SIZE}px]`,
              )}
            >
              <option value="general">General Inquiry</option>
              <option value="booking">Booking Request</option>
              <option value="follow-up">Follow-up</option>
              <option value="confirmation">Confirmation</option>
            </select>,
            'inquiryType',
            true,
          )}

          {renderFormField(
            'Wedding Details',
            <>
              <input
                type="date"
                value={context.weddingDate || ''}
                onChange={(e) => updateContext({ weddingDate: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 border border-gray-300 rounded-lg text-lg',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              />
              <input
                type="text"
                value={context.venue || ''}
                onChange={(e) => updateContext({ venue: e.target.value })}
                placeholder="Venue name (optional)"
                className={cn(
                  'w-full px-4 py-3 border border-gray-300 rounded-lg text-lg',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              />
            </>,
            'weddingDetails',
          )}

          {renderFormField(
            'Personal Notes',
            <textarea
              value={context.personalNotes || ''}
              onChange={(e) => updateContext({ personalNotes: e.target.value })}
              placeholder="Any special notes or context..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg resize-none"
            />,
            'personalNotes',
          )}

          {renderFormField(
            'Priority Level',
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => updateContext({ urgency: level })}
                  className={cn(
                    'py-3 px-4 rounded-lg border text-center font-medium transition-all active:scale-95',
                    context.urgency === level
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300',
                    `min-h-[${TOUCH_TARGET_SIZE}px]`,
                  )}
                >
                  {level === 'low' && '🟢 Low'}
                  {level === 'medium' && '🟡 Medium'}
                  {level === 'high' && '🔴 High'}
                </button>
              ))}
            </div>,
            'urgency',
          )}

          {/* Generated Templates Display */}
          {generatedTemplates.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">
                Generated Templates
              </h3>
              <TouchOptimizedVariantSelector
                templates={generatedTemplates}
                onTemplateSelect={(template) => {
                  toast({ title: `Selected: ${template.subject}` });
                  haptic.light();
                }}
                onTemplateEdit={(template) => {
                  toast({ title: `Editing: ${template.subject}` });
                  haptic.medium();
                }}
              />
            </div>
          )}
        </div>

        {/* Fixed Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <button
            ref={generateButtonRef}
            onClick={generateTemplates}
            disabled={isGenerating || !context.name.trim()}
            className={cn(
              'w-full py-4 px-6 bg-blue-600 text-white rounded-lg font-semibold',
              'transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center space-x-2',
              `min-h-[${TOUCH_TARGET_SIZE + 8}px]`,
            )}
          >
            {isGenerating ? (
              <>
                <RefreshCwIcon className="w-5 h-5 animate-spin" />
                <span>Generating Templates...</span>
              </>
            ) : (
              <>
                <ZapIcon className="w-5 h-5" />
                <span>Generate AI Templates</span>
              </>
            )}
          </button>
        </div>

        {/* Settings Bottom Sheet */}
        <BottomSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          snapPoints={[0.4, 0.7]}
        >
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Sound Effects</span>
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  haptic.light();
                }}
                className="p-2 rounded-lg bg-gray-100"
              >
                {isMuted ? (
                  <VolumeXIcon className="w-5 h-5" />
                ) : (
                  <Volume2Icon className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>Voice Input</span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  voice.isSupported
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800',
                )}
              >
                {voice.isSupported ? 'Available' : 'Not Supported'}
              </span>
            </div>
          </div>
        </BottomSheet>
      </PullToRefresh>
    </div>
  );
}
