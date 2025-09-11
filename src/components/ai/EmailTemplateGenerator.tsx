'use client';

import React, { useState } from 'react';
import { useActionState } from 'react';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useEmailTemplateStore,
  AI_EMAIL_STAGES,
  AI_EMAIL_TONES,
  AI_EMAIL_ELEMENTS,
} from '@/stores/useEmailTemplateStore';
import {
  EmailTemplateGeneratorProps,
  EmailGenerationConfig,
} from '@/types/ai-email';

const EmailTemplateGenerator: React.FC<EmailTemplateGeneratorProps> = ({
  onTemplatesGenerated,
  clientContext,
  vendorContext,
  initialConfig,
  className = '',
}) => {
  const {
    generationConfig,
    isGenerating,
    generationProgress,
    generationError,
    generatedVariants,
    updateGenerationConfig,
    generateTemplates,
    setActiveStep,
  } = useEmailTemplateStore();

  // Initialize config if not set
  React.useEffect(() => {
    if (
      !generationConfig &&
      (initialConfig || clientContext || vendorContext)
    ) {
      const config: Partial<EmailGenerationConfig> = {
        ...initialConfig,
        ...(clientContext && { client_context: { ...clientContext } }),
        ...(vendorContext && { vendor_context: { ...vendorContext } }),
      };
      updateGenerationConfig(config);
    }
  }, [
    initialConfig,
    clientContext,
    vendorContext,
    generationConfig,
    updateGenerationConfig,
  ]);

  // Form action using React 19 useActionState
  const [error, submitAction, isPending] = useActionState(
    async (previousState: string | null, formData: FormData) => {
      try {
        // Extract form data
        const stage = formData.get('stage') as EmailGenerationConfig['stage'];
        const tone = formData.get('tone') as EmailGenerationConfig['tone'];
        const elements = {
          pricing: formData.get('pricing') === 'on',
          timeline: formData.get('timeline') === 'on',
          next_steps: formData.get('next_steps') === 'on',
          portfolio: formData.get('portfolio') === 'on',
          testimonials: formData.get('testimonials') === 'on',
          availability: formData.get('availability') === 'on',
        };
        const coupleNames = formData.get('couple_names') as string;
        const weddingDate = formData.get('wedding_date') as string;
        const venueName = formData.get('venue_name') as string;
        const venueType = formData.get('venue_type') as
          | 'indoor'
          | 'outdoor'
          | 'hybrid';
        const guestCount = formData.get('guest_count')
          ? parseInt(formData.get('guest_count') as string)
          : undefined;
        const customInstructions = formData.get(
          'custom_instructions',
        ) as string;
        const variantCount = formData.get('variant_count')
          ? parseInt(formData.get('variant_count') as string)
          : 5;

        // Update config
        const newConfig: EmailGenerationConfig = {
          stage,
          tone,
          elements,
          client_context: {
            couple_names: coupleNames,
            wedding_date: weddingDate || undefined,
            venue_name: venueName || undefined,
            venue_type: venueType || undefined,
            guest_count: guestCount,
            ...clientContext,
          },
          vendor_context: vendorContext || {
            business_name: '',
            primary_category: '',
            specialties: [],
            unique_selling_points: [],
            availability_status: 'available',
          },
          custom_instructions: customInstructions || undefined,
          variant_count: variantCount,
        };

        updateGenerationConfig(newConfig);
        await generateTemplates();

        if (onTemplatesGenerated) {
          onTemplatesGenerated(generatedVariants);
        }

        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Generation failed';
      }
    },
    null,
  );

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-6 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            AI Email Template Generator
          </h2>
          <p className="text-sm text-gray-600">
            Generate personalized email templates in seconds
          </p>
        </div>
      </div>

      <form action={submitAction} className="space-y-6">
        {/* Stage Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Communication Stage
          </label>
          <select
            name="stage"
            defaultValue={generationConfig?.stage || 'inquiry'}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
            disabled={isGenerating || isPending}
          >
            {AI_EMAIL_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label} - {stage.description}
              </option>
            ))}
          </select>
        </div>

        {/* Tone Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Communication Tone
          </label>
          <div className="grid grid-cols-3 gap-3">
            {AI_EMAIL_TONES.map((tone) => (
              <label key={tone.value} className="relative">
                <input
                  type="radio"
                  name="tone"
                  value={tone.value}
                  defaultChecked={
                    generationConfig?.tone === tone.value ||
                    tone.value === 'friendly'
                  }
                  disabled={isGenerating || isPending}
                  className="sr-only peer"
                />
                <div className="flex flex-col items-center p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 peer-checked:bg-primary-50 peer-checked:border-primary-300 peer-checked:ring-2 peer-checked:ring-primary-100 hover:bg-gray-100 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                  <span className="font-medium text-sm text-gray-900 peer-checked:text-primary-700">
                    {tone.label}
                  </span>
                  <span className="text-xs text-gray-600 text-center peer-checked:text-primary-600">
                    {tone.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Elements to Include */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Elements to Include
          </label>
          <div className="grid grid-cols-2 gap-3">
            {AI_EMAIL_ELEMENTS.map((element) => (
              <label
                key={element.key}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input
                  type="checkbox"
                  name={element.key}
                  defaultChecked={
                    generationConfig?.elements[
                      element.key as keyof typeof generationConfig.elements
                    ] || element.key === 'next_steps'
                  }
                  disabled={isGenerating || isPending}
                  className="mt-0.5 w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {element.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {element.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Client Context */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            Client Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couple Names *
              </label>
              <input
                type="text"
                name="couple_names"
                defaultValue={
                  generationConfig?.client_context.couple_names || ''
                }
                placeholder="Sarah & Michael"
                required
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wedding Date
              </label>
              <input
                type="date"
                name="wedding_date"
                defaultValue={
                  generationConfig?.client_context.wedding_date || ''
                }
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Name
              </label>
              <input
                type="text"
                name="venue_name"
                defaultValue={generationConfig?.client_context.venue_name || ''}
                placeholder="The Grand Manor"
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Type
              </label>
              <select
                name="venue_type"
                defaultValue={generationConfig?.client_context.venue_type || ''}
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select venue type</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="hybrid">Indoor & Outdoor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Count (approx.)
              </label>
              <input
                type="number"
                name="guest_count"
                defaultValue={
                  generationConfig?.client_context.guest_count || ''
                }
                placeholder="100"
                min="1"
                max="1000"
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Variants
              </label>
              <select
                name="variant_count"
                defaultValue={generationConfig?.variant_count || 5}
                disabled={isGenerating || isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="3">3 variants</option>
                <option value="5">5 variants</option>
                <option value="7">7 variants</option>
                <option value="10">10 variants</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Custom Instructions (Optional)
          </label>
          <textarea
            name="custom_instructions"
            defaultValue={generationConfig?.custom_instructions || ''}
            placeholder="Any specific requirements or style preferences..."
            rows={3}
            disabled={isGenerating || isPending}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Error Display */}
        {(error || generationError) && (
          <div className="flex items-start gap-3 p-4 bg-error-50 border border-error-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-error-700">
                Generation Failed
              </h4>
              <p className="text-sm text-error-600 mt-1">
                {error || generationError}
              </p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {generatedVariants.length > 0 && !isGenerating && !isPending && (
          <div className="flex items-start gap-3 p-4 bg-success-50 border border-success-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-success-700">
                Templates Generated!
              </h4>
              <p className="text-sm text-success-600 mt-1">
                Generated {generatedVariants.length} email variants. Ready for
                selection.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(isGenerating || isPending) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Generating templates...
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(generationProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed"
        >
          {isGenerating || isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Templates...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Email Templates
            </>
          )}
        </button>
      </form>

      {/* Helper Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Pro Tip:</strong> The more context you provide, the better the
          AI can personalize your emails. Consider adding venue details, guest
          count, and any special requirements.
        </p>
      </div>
    </div>
  );
};

export default EmailTemplateGenerator;
