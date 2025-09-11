'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { VendorSpecificControls } from './VendorSpecificControls';
import { GeneratedJourneyPreview } from './GeneratedJourneyPreview';
import { PerformancePredictionDisplay } from './PerformancePredictionDisplay';
import {
  JourneySuggestionsPanelProps,
  JourneySuggestionRequest,
  GeneratedJourney,
  VendorType,
  ServiceLevel,
  CommunicationStyle,
  CommunicationFrequency,
} from '@/types/journey-ai';

// Mock AI service for development - replace with actual API
const mockAIService = {
  generateJourney: async (
    request: JourneySuggestionRequest,
  ): Promise<GeneratedJourney> => {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    );

    // Mock generated journey based on vendor type
    const mockJourney: GeneratedJourney = {
      id: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        generatedAt: new Date(),
        aiModel: 'gpt-4-wedding-specialist',
        version: '1.0.0',
        confidence: 0.87 + Math.random() * 0.1,
        estimatedPerformance: {
          completionRate: 0.85 + Math.random() * 0.1,
          engagementScore: 80 + Math.random() * 15,
          estimatedTimeToCompletion: request.weddingTimeline * 30 * 0.8,
          clientSatisfactionScore: 8.2 + Math.random() * 1.5,
          industryBenchmark: {
            completionRate: 0.82,
            engagementScore: 78,
            avgTimeToCompletion: request.weddingTimeline * 30,
          },
          confidenceIntervals: {
            completionRate: { lower: 0.78, upper: 0.92 },
            engagementScore: { lower: 72, upper: 88 },
          },
        },
        generationRequest: request,
      },
      journey: {
        nodes: [
          {
            id: 'start_1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: {
              title: 'Client Journey Start',
              timing: { delay: 0 },
              metadata: {
                aiGenerated: true,
                confidence: 0.95,
                reasoning: 'Starting point for all client communications',
              },
            },
            connections: [{ to: 'email_1' }],
          },
          {
            id: 'email_1',
            type: 'email',
            position: { x: 300, y: 100 },
            data: {
              title: 'Welcome & Introduction',
              description:
                'Personalized welcome email introducing your services',
              timing: { delay: 1 },
              content: {
                subject: `Welcome to your ${request.vendorType} journey!`,
                body: "Thank you for choosing us for your special day. We're excited to work with you...",
              },
              metadata: {
                aiGenerated: true,
                confidence: 0.91,
                reasoning:
                  'Initial contact establishes relationship and sets expectations',
              },
            },
            connections: [{ to: 'form_1' }],
          },
          {
            id: 'form_1',
            type: 'form',
            position: { x: 500, y: 100 },
            data: {
              title: 'Client Preferences Form',
              description: 'Gather detailed preferences and requirements',
              timing: { delay: 3 },
              metadata: {
                aiGenerated: true,
                confidence: 0.88,
                reasoning:
                  'Collecting client preferences enables personalized service delivery',
              },
            },
            connections: [{ to: 'meeting_1' }],
          },
          {
            id: 'meeting_1',
            type: 'meeting',
            position: { x: 700, y: 100 },
            data: {
              title: 'Initial Consultation',
              description: 'In-person or virtual consultation meeting',
              timing: { delay: 7 },
              metadata: {
                aiGenerated: true,
                confidence: 0.93,
                reasoning:
                  'Personal consultation builds trust and clarifies expectations',
              },
            },
            connections: [{ to: 'end_1' }],
          },
          {
            id: 'end_1',
            type: 'end',
            position: { x: 900, y: 100 },
            data: {
              title: 'Journey Complete',
              timing: { delay: 0 },
              metadata: {
                aiGenerated: true,
                confidence: 0.95,
                reasoning: 'End point for journey completion tracking',
              },
            },
            connections: [],
          },
        ],
        connections: [
          {
            id: 'conn_1',
            from: 'start_1',
            to: 'email_1',
            type: 'default',
          },
          {
            id: 'conn_2',
            from: 'email_1',
            to: 'form_1',
            type: 'default',
          },
          {
            id: 'conn_3',
            from: 'form_1',
            to: 'meeting_1',
            type: 'default',
          },
          {
            id: 'conn_4',
            from: 'meeting_1',
            to: 'end_1',
            type: 'default',
          },
        ],
        settings: {
          name: `${request.vendorType.charAt(0).toUpperCase() + request.vendorType.slice(1)} Journey - ${request.serviceLevel}`,
          description: `AI-generated ${request.serviceLevel} level journey for ${request.vendorType} services`,
          tags: ['ai-generated', request.vendorType, request.serviceLevel],
          isActive: false,
        },
      },
      optimizationSuggestions: [
        {
          id: 'opt_1',
          type: 'timing',
          priority: 'high',
          title: 'Optimize consultation timing',
          description:
            'Consider scheduling consultation 2 days earlier for better engagement',
          reasoning:
            'Industry data shows 15% higher completion rates with earlier consultation scheduling',
          expectedImprovement: {
            metric: 'completionRate',
            increase: 12,
          },
          implementation: {
            difficulty: 'easy',
            timeRequired: 5,
            steps: ['Adjust meeting node timing', 'Update automated reminders'],
          },
          applicableToNodes: ['meeting_1'],
        },
      ],
    };

    return mockJourney;
  },
};

export function JourneySuggestionsPanel({
  isOpen = false,
  onJourneyGenerated,
  onJourneySaved,
  onClose,
  existingJourneys = [],
}: JourneySuggestionsPanelProps) {
  // Generation request state
  const [generationRequest, setGenerationRequest] =
    useState<JourneySuggestionRequest>({
      vendorType: 'photographer' as VendorType,
      serviceLevel: 'premium' as ServiceLevel,
      weddingTimeline: 12,
      clientPreferences: {
        communicationStyle: 'friendly' as CommunicationStyle,
        frequency: 'regular' as CommunicationFrequency,
        preferredChannels: ['email', 'sms'],
        timeOfDay: 'any',
      },
    });

  // UI state
  const [currentStep, setCurrentStep] = useState<
    'configure' | 'generating' | 'preview' | 'save'
  >('configure');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJourney, setGeneratedJourney] =
    useState<GeneratedJourney | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({
    stage: 'analyzing' as
      | 'analyzing'
      | 'generating'
      | 'optimizing'
      | 'validating',
    progress: 0,
    message: '',
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateRequest = useCallback(
    (request: JourneySuggestionRequest): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (!request.vendorType) {
        errors.vendorType = 'Please select a vendor type';
      }

      if (!request.serviceLevel) {
        errors.serviceLevel = 'Please select a service level';
      }

      if (request.weddingTimeline < 1 || request.weddingTimeline > 24) {
        errors.weddingTimeline = 'Timeline must be between 1 and 24 months';
      }

      if (!request.clientPreferences.communicationStyle) {
        errors.communicationStyle = 'Please select a communication style';
      }

      if (!request.clientPreferences.frequency) {
        errors.frequency = 'Please select communication frequency';
      }

      if (!request.clientPreferences.preferredChannels?.length) {
        errors.preferredChannels =
          'Please select at least one communication channel';
      }

      return errors;
    },
    [],
  );

  const handleGenerateJourney = useCallback(async () => {
    const errors = validateRequest(generationRequest);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fix the validation errors before generating');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setError(null);

    try {
      // Simulate generation progress
      const stages = [
        {
          stage: 'analyzing',
          message: 'Analyzing vendor requirements and client preferences...',
          duration: 1000,
        },
        {
          stage: 'generating',
          message: 'Generating personalized journey structure...',
          duration: 2000,
        },
        {
          stage: 'optimizing',
          message: 'Applying industry best practices and optimizations...',
          duration: 1500,
        },
        {
          stage: 'validating',
          message: 'Validating journey completeness and performance...',
          duration: 500,
        },
      ] as const;

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        setGenerationProgress({
          stage: stage.stage,
          progress: (i / stages.length) * 100,
          message: stage.message,
        });

        await new Promise((resolve) => setTimeout(resolve, stage.duration));
      }

      // Generate the actual journey
      const journey = await mockAIService.generateJourney(generationRequest);

      setGeneratedJourney(journey);
      setCurrentStep('preview');
      onJourneyGenerated(journey);
    } catch (err) {
      console.error('Journey generation error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate journey. Please try again.',
      );
      setCurrentStep('configure');
    } finally {
      setIsGenerating(false);
    }
  }, [generationRequest, validateRequest, onJourneyGenerated]);

  const handleRetry = useCallback(() => {
    setError(null);
    setCurrentStep('configure');
    setGeneratedJourney(null);
  }, []);

  const handleSave = useCallback(
    async (journey: GeneratedJourney) => {
      try {
        setCurrentStep('save');
        // Mock save delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        onJourneySaved(journey);
        setCurrentStep('configure');
        setGeneratedJourney(null);

        // Show success briefly
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } catch (err) {
        console.error('Save error:', err);
        setError('Failed to save journey. Please try again.');
        setCurrentStep('preview');
      }
    },
    [onJourneySaved, onClose],
  );

  const handleCustomize = useCallback(() => {
    // This would open the journey canvas editor
    console.log('Opening journey customization...');
    if (generatedJourney) {
      onJourneyGenerated(generatedJourney);
    }
  }, [generatedJourney, onJourneyGenerated]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-background shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-elevated px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-accent p-2">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  AI Journey Suggestions
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate personalized customer journeys for your wedding
                  business
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              disabled={isGenerating}
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Progress indicator */}
          <div className="bg-elevated px-6 py-2">
            <div className="flex items-center space-x-4">
              {[
                { key: 'configure', label: 'Configure', icon: Zap },
                { key: 'generating', label: 'Generate', icon: Loader2 },
                { key: 'preview', label: 'Preview', icon: TrendingUp },
                { key: 'save', label: 'Save', icon: Save },
              ].map(({ key, label, icon: Icon }, index) => (
                <div key={key} className="flex items-center space-x-2">
                  <div
                    className={`flex items-center space-x-2 rounded-lg px-3 py-1 text-sm ${
                      currentStep === key
                        ? 'bg-accent text-accent-foreground'
                        : index <
                            [
                              'configure',
                              'generating',
                              'preview',
                              'save',
                            ].indexOf(currentStep)
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        currentStep === key && isGenerating
                          ? 'animate-spin'
                          : ''
                      }`}
                    />
                    <span>{label}</span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-0.5 w-8 ${
                        index <
                        ['configure', 'generating', 'preview', 'save'].indexOf(
                          currentStep,
                        )
                          ? 'bg-success'
                          : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {/* Configuration Step */}
              {currentStep === 'configure' && (
                <div className="space-y-6">
                  <VendorSpecificControls
                    request={generationRequest}
                    onChange={setGenerationRequest}
                    isLoading={isGenerating}
                    errors={validationErrors}
                  />

                  {error && (
                    <div className="mx-6 rounded-lg bg-danger/10 border border-danger/20 p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-danger" />
                        <p className="text-sm text-danger font-medium">Error</p>
                      </div>
                      <p className="text-sm text-danger mt-1">{error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Generation Step */}
              {currentStep === 'generating' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6 max-w-md">
                    <div className="relative">
                      <div className="h-16 w-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-accent animate-spin" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-accent-foreground" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Generating Your Journey
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {generationProgress.message}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all duration-500"
                          style={{ width: `${generationProgress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {Math.round(generationProgress.progress)}% complete
                      </p>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        • Analyzing your {generationRequest.vendorType} workflow
                      </p>
                      <p>
                        • Applying {generationRequest.serviceLevel} service
                        patterns
                      </p>
                      <p>
                        • Optimizing for {generationRequest.weddingTimeline}
                        -month timeline
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Step */}
              {currentStep === 'preview' && generatedJourney && (
                <div className="space-y-6 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Generated Journey Preview
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        AI confidence:{' '}
                        {Math.round(generatedJourney.metadata.confidence * 100)}
                        % •{generatedJourney.journey.nodes.length} touchpoints
                      </p>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Generate New</span>
                    </button>
                  </div>

                  <PerformancePredictionDisplay
                    performance={generatedJourney.metadata.estimatedPerformance}
                    showComparison
                    comparisonBaseline={
                      generatedJourney.metadata.estimatedPerformance
                        .industryBenchmark
                    }
                  />

                  <GeneratedJourneyPreview
                    journey={generatedJourney}
                    onNodeSelect={() => {}}
                    onNodeEdit={() => {}}
                    onSave={handleSave}
                    onCustomize={handleCustomize}
                    showOptimizations
                  />
                </div>
              )}

              {/* Save Step */}
              {currentStep === 'save' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Journey Saved!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your AI-generated journey has been saved successfully.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          {currentStep === 'configure' && (
            <footer className="border-t border-border bg-elevated px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Generation typically takes 30-60 seconds
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateJourney}
                    disabled={isGenerating}
                    className="flex items-center space-x-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Journey</span>
                  </button>
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
