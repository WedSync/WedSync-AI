'use client';

/**
 * Integrated Mood Board Generator - Production Component
 * WS-130 Round 3: Final integration with all team outputs
 *
 * Features:
 * - Photography AI mood board generation
 * - Music AI style coordination
 * - Floral AI color harmony
 * - Usage tracking and feature gating
 * - Production-ready error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Camera,
  Palette,
  Music,
  Flower,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  IntegratedPhotoAnalysis,
  ApiResponse,
  IntegrationPreferences,
  FeatureAccessResult,
} from '@/types/photography-integrations';

interface IntegratedMoodBoardGeneratorProps {
  clientId: string;
  initialWeddingStyle?: string;
  initialColors?: string[];
  onAnalysisComplete?: (analysis: IntegratedPhotoAnalysis) => void;
}

export default function IntegratedMoodBoardGenerator({
  clientId,
  initialWeddingStyle = '',
  initialColors = [],
  onAnalysisComplete,
}: IntegratedMoodBoardGeneratorProps) {
  // State management
  const [weddingStyle, setWeddingStyle] = useState(initialWeddingStyle);
  const [preferredColors, setPreferredColors] =
    useState<string[]>(initialColors);
  const [weddingDate, setWeddingDate] = useState('');
  const [moodBoardImages, setMoodBoardImages] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState({ min: 200, max: 500 });
  const [integrationPreferences, setIntegrationPreferences] =
    useState<IntegrationPreferences>({
      sync_with_music: true,
      sync_with_floral: true,
      track_usage: true,
    });

  // Processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IntegratedPhotoAnalysis | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [featureAccess, setFeatureAccess] =
    useState<FeatureAccessResult | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<
    'photography' | 'music' | 'floral' | 'integration'
  >('photography');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const router = useRouter();

  // Wedding style options
  const weddingStyles = [
    'romantic',
    'rustic',
    'modern',
    'vintage',
    'bohemian',
    'classic',
    'industrial',
    'garden',
    'beach',
    'mountain',
    'art-deco',
    'minimalist',
  ];

  // Color palette options
  const colorOptions = [
    'white',
    'ivory',
    'blush',
    'dusty-rose',
    'burgundy',
    'navy',
    'sage',
    'eucalyptus',
    'gold',
    'champagne',
    'coral',
    'lavender',
    'dusty-blue',
    'mauve',
    'terracotta',
    'emerald',
  ];

  // Check feature access on component mount
  useEffect(() => {
    checkFeatureAccess();
  }, []);

  const checkFeatureAccess = async () => {
    try {
      const response = await fetch('/api/billing/feature-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: 'ai:photo_processing' }),
      });

      if (response.ok) {
        const accessData = await response.json();
        setFeatureAccess(accessData);

        // Show upgrade prompt if nearing limits
        if (accessData.usagePercentage && accessData.usagePercentage > 80) {
          setShowUpgradePrompt(true);
        }
      }
    } catch (error) {
      console.error('Failed to check feature access:', error);
    }
  };

  // Handle image upload
  const handleImageUpload = useCallback(
    async (files: FileList) => {
      if (moodBoardImages.length + files.length > 20) {
        toast.error('Maximum 20 images allowed');
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);

        try {
          const response = await fetch('/api/upload/mood-board', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const { url } = await response.json();
            return url;
          }
          throw new Error('Upload failed');
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url) => url !== null) as string[];

      if (validUrls.length > 0) {
        setMoodBoardImages((prev) => [...prev, ...validUrls]);
        toast.success(`${validUrls.length} images uploaded successfully`);
      }
    },
    [moodBoardImages.length, clientId],
  );

  // Main analysis function
  const handleAnalyze = async () => {
    if (
      !weddingStyle ||
      preferredColors.length === 0 ||
      !weddingDate ||
      moodBoardImages.length === 0
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (featureAccess && !featureAccess.hasAccess) {
      toast.error(featureAccess.reason || 'Feature access denied');
      setShowUpgradePrompt(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProcessingStep('Initializing analysis...');

    try {
      const requestBody = {
        client_id: clientId,
        wedding_style: weddingStyle,
        preferred_colors: preferredColors,
        wedding_date: new Date(weddingDate).toISOString(),
        mood_board_images: moodBoardImages,
        budget_range: budgetRange,
        integration_preferences: integrationPreferences,
      };

      setProcessingStep('Processing photography analysis...');

      const response = await fetch('/api/photography/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result: ApiResponse<IntegratedPhotoAnalysis> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Analysis failed');
      }

      if (!result.data) {
        throw new Error('No analysis data received');
      }

      setProcessingStep('Coordinating with music and floral AI...');

      // Simulate processing steps for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setAnalysis(result.data);
      setProcessingStep('Analysis complete!');

      toast.success('Analysis completed successfully!');

      if (onAnalysisComplete) {
        onAnalysisComplete(result.data);
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setError(error.message);
      toast.error(error.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
    }
  };

  // Color selection handlers
  const handleColorToggle = (color: string) => {
    if (preferredColors.includes(color)) {
      setPreferredColors((prev) => prev.filter((c) => c !== color));
    } else if (preferredColors.length < 6) {
      setPreferredColors((prev) => [...prev, color]);
    } else {
      toast.error('Maximum 6 colors allowed');
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setMoodBoardImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900">
              AI Photography Analysis
            </h1>
            <p className="text-md text-gray-600 mt-2">
              Generate mood boards with coordinated music and floral
              recommendations
            </p>
          </div>

          {featureAccess && (
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {featureAccess.usageLimit ? (
                  <>
                    {featureAccess.currentUsage || 0} /{' '}
                    {featureAccess.usageLimit} analyses used
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${featureAccess.usagePercentage || 0}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  'Unlimited analyses'
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-warning-800">
                Approaching Usage Limit
              </h3>
              <p className="text-sm text-warning-700 mt-1">
                You're using {featureAccess?.usagePercentage}% of your monthly
                AI analysis quota. Upgrade for unlimited access.
              </p>
              <button
                onClick={() => router.push('/billing/upgrade')}
                className="mt-2 text-sm font-medium text-warning-800 hover:text-warning-900"
              >
                Upgrade Plan →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuration
            </h2>

            {/* Wedding Style */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Wedding Style *
              </label>
              <select
                value={weddingStyle}
                onChange={(e) => setWeddingStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              >
                <option value="">Select style...</option>
                {weddingStyles.map((style) => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Wedding Date */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Wedding Date *
              </label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Preferred Colors * ({preferredColors.length}/6)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorToggle(color)}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      preferredColors.includes(color)
                        ? 'border-primary-600 ring-2 ring-primary-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: getColorHex(color) }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {preferredColors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Budget Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    value={budgetRange.min}
                    onChange={(e) =>
                      setBudgetRange((prev) => ({
                        ...prev,
                        min: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    value={budgetRange.max}
                    onChange={(e) =>
                      setBudgetRange((prev) => ({
                        ...prev,
                        max: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              </div>
            </div>

            {/* Integration Preferences */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Integration Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={integrationPreferences.sync_with_music}
                    onChange={(e) =>
                      setIntegrationPreferences((prev) => ({
                        ...prev,
                        sync_with_music: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-100"
                  />
                  <span className="text-sm text-gray-700">
                    Sync with Music AI
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={integrationPreferences.sync_with_floral}
                    onChange={(e) =>
                      setIntegrationPreferences((prev) => ({
                        ...prev,
                        sync_with_floral: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-100"
                  />
                  <span className="text-sm text-gray-700">
                    Sync with Floral AI
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={integrationPreferences.track_usage}
                    onChange={(e) =>
                      setIntegrationPreferences((prev) => ({
                        ...prev,
                        track_usage: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-100"
                  />
                  <span className="text-sm text-gray-700">
                    Track usage for insights
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reference Images *
            </h3>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && handleImageUpload(e.target.files)
                  }
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Camera className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Upload Images
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG up to 10MB each (max 20 images)
                  </span>
                </label>
              </div>

              {moodBoardImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {moodBoardImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`Mood board ${index + 1}`}
                        width={100}
                        height={100}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !featureAccess?.hasAccess}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>{processingStep || 'Analyzing...'}</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-error-50 border border-error-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-error-800">
                    Analysis Failed
                  </h3>
                  <p className="text-sm text-error-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {analysis ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'photography', label: 'Photography', icon: Camera },
                    { id: 'music', label: 'Music', icon: Music },
                    { id: 'floral', label: 'Floral', icon: Flower },
                    { id: 'integration', label: 'Integration', icon: Zap },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'photography' && (
                  <PhotographyResults
                    analysis={analysis.photography_analysis}
                  />
                )}

                {activeTab === 'music' && (
                  <MusicCoordinationResults
                    styleConsistency={analysis.style_consistency}
                    syncEnabled={integrationPreferences.sync_with_music}
                  />
                )}

                {activeTab === 'floral' && (
                  <FloralCoordinationResults
                    colorHarmony={analysis.color_harmony}
                    syncEnabled={integrationPreferences.sync_with_floral}
                  />
                )}

                {activeTab === 'integration' && (
                  <IntegrationResults
                    metrics={analysis.integration_metrics}
                    recommendations={analysis.recommendations}
                    usageTracked={analysis.usage_tracked}
                  />
                )}
              </div>
            </div>
          ) : !isAnalyzing ? (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-12 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Generate Analysis
              </h3>
              <p className="text-gray-600">
                Configure your preferences and upload images to get started
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing Analysis
              </h3>
              <p className="text-gray-600">{processingStep}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for photography results
function PhotographyResults({ analysis }: { analysis: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Photography Analysis
        </h3>

        {analysis.style_analysis && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Style Analysis</h4>
            <p className="text-sm text-gray-600">
              Primary Style:{' '}
              <span className="font-medium">
                {analysis.style_analysis.primary_style}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Confidence:{' '}
              {(analysis.style_analysis.confidence_score * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {analysis.recommendations && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for music coordination results
function MusicCoordinationResults({
  styleConsistency,
  syncEnabled,
}: {
  styleConsistency: any;
  syncEnabled: boolean;
}) {
  if (!syncEnabled) {
    return (
      <div className="text-center py-8">
        <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Music synchronization is disabled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Music Coordination
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {Math.round(styleConsistency.style_match_score || 0)}%
          </div>
          <div className="text-sm text-gray-600">Style Match Score</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {Math.round(styleConsistency.energy_alignment || 0)}%
          </div>
          <div className="text-sm text-gray-600">Energy Alignment</div>
        </div>
      </div>

      {styleConsistency.recommendations && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {styleConsistency.recommendations.map(
              (rec: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper component for floral coordination results
function FloralCoordinationResults({
  colorHarmony,
  syncEnabled,
}: {
  colorHarmony: any;
  syncEnabled: boolean;
}) {
  if (!syncEnabled) {
    return (
      <div className="text-center py-8">
        <Flower className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Floral synchronization is disabled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Floral Coordination
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {Math.round(colorHarmony.color_harmony_score || 0)}%
          </div>
          <div className="text-sm text-gray-600">Color Harmony Score</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {Math.round(colorHarmony.palette_compatibility || 0)}%
          </div>
          <div className="text-sm text-gray-600">Palette Compatibility</div>
        </div>
      </div>

      {colorHarmony.coordinated_palette && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">
            Coordinated Palette
          </h4>
          <div className="flex space-x-2">
            {colorHarmony.coordinated_palette.map(
              (color: string, index: number) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full border-2 border-gray-200"
                  style={{ backgroundColor: getColorHex(color) }}
                  title={color}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for integration results
function IntegrationResults({
  metrics,
  recommendations,
  usageTracked,
}: {
  metrics: any;
  recommendations: any;
  usageTracked: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Integration Summary
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {Math.round(metrics.overall_coherence_score)}%
          </div>
          <div className="text-sm text-gray-600">Overall Coherence</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-success-600 mb-1">
            {metrics.teams_integrated.length}
          </div>
          <div className="text-sm text-gray-600">Teams Integrated</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {metrics.processing_time_ms}ms
          </div>
          <div className="text-sm text-gray-600">Processing Time</div>
        </div>
      </div>

      {metrics.integration_success_rate && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Integration Success Rate
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                metrics.integration_success_rate === 'high'
                  ? 'bg-success-50 text-success-700'
                  : metrics.integration_success_rate === 'medium'
                    ? 'bg-warning-50 text-warning-700'
                    : 'bg-error-50 text-error-700'
              }`}
            >
              {metrics.integration_success_rate}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(recommendations || {}).map(([category, recs]) => {
          if (!Array.isArray(recs) || recs.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="font-medium text-gray-900 mb-2 capitalize">
                {category.replace(/_/g, ' ')} Recommendations
              </h4>
              <ul className="space-y-1">
                {(recs as string[]).map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-success-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {usageTracked && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-success-800">
                Usage Tracked
              </h4>
              <p className="text-sm text-success-700 mt-1">
                This analysis has been tracked for insights and billing
                purposes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get color hex codes
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    white: '#FFFFFF',
    ivory: '#FFFFF0',
    blush: '#FFF0F5',
    'dusty-rose': '#DCAE96',
    burgundy: '#800020',
    navy: '#000080',
    sage: '#9CAF88',
    eucalyptus: '#6BA368',
    gold: '#FFD700',
    champagne: '#F7E7CE',
    coral: '#FF7F50',
    lavender: '#E6E6FA',
    'dusty-blue': '#6B8CAE',
    mauve: '#E0B0FF',
    terracotta: '#E2725B',
    emerald: '#50C878',
  };

  return colorMap[colorName] || '#808080';
}
