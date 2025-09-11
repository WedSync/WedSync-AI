'use client';

import { useState, useEffect } from 'react';
import { useHaptic } from '@/hooks/useTouch';

interface SustainabilityMetric {
  category: string;
  score: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
  suggestions: string[];
}

interface SustainabilityReport {
  overall_score: number;
  carbon_footprint: number;
  water_usage: number;
  local_sourcing: number;
  metrics: SustainabilityMetric[];
  improvements: string[];
  certifications: string[];
}

interface MobileSustainabilityAnalyzerProps {
  weddingId?: string;
  isOffline: boolean;
  onAnalysisComplete?: (report: SustainabilityReport) => void;
}

export function MobileSustainabilityAnalyzer({
  weddingId,
  isOffline,
  onAnalysisComplete,
}: MobileSustainabilityAnalyzerProps) {
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([]);
  const [venue, setVenue] = useState('');
  const [season, setSeason] = useState('spring');
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    success: successHaptic,
    light: lightHaptic,
    warning: warningHaptic,
  } = useHaptic();

  const commonFlowers = [
    { id: 'roses', name: '🌹 Roses', sustainability: 0.6, local: false },
    { id: 'tulips', name: '🌷 Tulips', sustainability: 0.8, local: true },
    { id: 'daisies', name: '🌼 Daisies', sustainability: 0.9, local: true },
    { id: 'lilies', name: '🌺 Lilies', sustainability: 0.5, local: false },
    {
      id: 'sunflowers',
      name: '🌻 Sunflowers',
      sustainability: 0.9,
      local: true,
    },
    { id: 'peonies', name: '🌸 Peonies', sustainability: 0.7, local: true },
    { id: 'orchids', name: '🌺 Orchids', sustainability: 0.4, local: false },
    {
      id: 'eucalyptus',
      name: '🌿 Eucalyptus',
      sustainability: 0.8,
      local: true,
    },
  ];

  const seasons = [
    { id: 'spring', name: '🌸 Spring', months: 'Mar-May' },
    { id: 'summer', name: '☀️ Summer', months: 'Jun-Aug' },
    { id: 'fall', name: '🍂 Fall', months: 'Sep-Nov' },
    { id: 'winter', name: '❄️ Winter', months: 'Dec-Feb' },
  ];

  const analyzeSelection = async () => {
    setLoading(true);

    try {
      // Simulate analysis delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const analysisReport = generateSustainabilityReport();
      setReport(analysisReport);
      onAnalysisComplete?.(analysisReport);

      // Haptic feedback based on score
      if (analysisReport.overall_score >= 0.8) {
        successHaptic();
      } else if (analysisReport.overall_score >= 0.6) {
        lightHaptic();
      } else {
        warningHaptic();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      warningHaptic();
    } finally {
      setLoading(false);
    }
  };

  const generateSustainabilityReport = (): SustainabilityReport => {
    const selectedFlowerData = selectedFlowers.map(
      (id) => commonFlowers.find((f) => f.id === id)!,
    );

    // Calculate overall sustainability
    const avgSustainability =
      selectedFlowerData.length > 0
        ? selectedFlowerData.reduce(
            (sum, flower) => sum + flower.sustainability,
            0,
          ) / selectedFlowerData.length
        : 0;

    // Calculate local sourcing percentage
    const localFlowers = selectedFlowerData.filter((f) => f.local).length;
    const localSourcing =
      selectedFlowerData.length > 0
        ? localFlowers / selectedFlowerData.length
        : 0;

    // Seasonal bonus
    const seasonalBonus = 0.1; // 10% bonus for seasonal selection

    const overall_score = Math.min(
      1,
      avgSustainability + localSourcing * 0.2 + seasonalBonus,
    );

    const metrics: SustainabilityMetric[] = [
      {
        category: 'Carbon Footprint',
        score: localSourcing * 0.8 + 0.2,
        impact:
          localSourcing > 0.7 ? 'low' : localSourcing > 0.4 ? 'medium' : 'high',
        description: 'Transportation and production emissions',
        suggestions: [
          'Choose locally grown flowers',
          'Select flowers in season',
          'Consider potted plants that can be replanted',
        ],
      },
      {
        category: 'Water Usage',
        score: avgSustainability * 0.9,
        impact:
          avgSustainability > 0.7
            ? 'low'
            : avgSustainability > 0.5
              ? 'medium'
              : 'high',
        description: 'Water consumption for growing flowers',
        suggestions: [
          'Choose drought-resistant varieties',
          'Select native species',
          'Use flowers that require less irrigation',
        ],
      },
      {
        category: 'Biodiversity Impact',
        score: overall_score * 0.85,
        impact:
          overall_score > 0.75
            ? 'low'
            : overall_score > 0.5
              ? 'medium'
              : 'high',
        description: 'Impact on local ecosystems',
        suggestions: [
          'Choose native flower varieties',
          'Avoid invasive species',
          'Support organic flower farms',
        ],
      },
      {
        category: 'Chemical Usage',
        score: avgSustainability * 0.7 + 0.3,
        impact:
          avgSustainability > 0.8
            ? 'low'
            : avgSustainability > 0.6
              ? 'medium'
              : 'high',
        description: 'Pesticides and fertilizers used in production',
        suggestions: [
          'Choose organic certified flowers',
          'Select from pesticide-free farms',
          'Consider wildflowers and foraged options',
        ],
      },
    ];

    const improvements = [
      'Source 80% of flowers locally (currently ' +
        Math.round(localSourcing * 100) +
        '%)',
      'Choose seasonal varieties for better freshness',
      'Consider potted centerpieces guests can take home',
      'Use flowers that can be composted after the event',
      'Select from certified sustainable flower farms',
    ];

    const certifications = [
      'Certified Naturally Grown',
      'Rainforest Alliance Certified',
      'Fairtrade Certified',
      'Organic Certified',
      'Veriflora Certified',
    ];

    return {
      overall_score,
      carbon_footprint: (1 - localSourcing) * 100, // kg CO2 equivalent
      water_usage: (1 - avgSustainability) * 500, // liters per arrangement
      local_sourcing: localSourcing * 100,
      metrics,
      improvements,
      certifications,
    };
  };

  const toggleFlowerSelection = (flowerId: string) => {
    setSelectedFlowers((prev) =>
      prev.includes(flowerId)
        ? prev.filter((id) => id !== flowerId)
        : [...prev, flowerId],
    );
    lightHaptic();
  };

  const clearSelection = () => {
    setSelectedFlowers([]);
    setReport(null);
    lightHaptic();
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 0.8) return '🌱';
    if (score >= 0.6) return '⚠️';
    return '🚫';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="mobile-sustainability-analyzer space-y-6">
      {isOffline && (
        <div className="bg-amber-100 border-amber-400 border rounded-lg p-3">
          <p className="text-amber-800 text-sm">
            🌱 Offline Mode: Basic sustainability analysis available
          </p>
        </div>
      )}

      {/* Flower Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Select Flowers ({selectedFlowers.length})
          </label>
          {selectedFlowers.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-red-500 text-sm font-medium min-h-[44px] touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {commonFlowers.map((flower) => (
            <button
              key={flower.id}
              onClick={() => toggleFlowerSelection(flower.id)}
              className={`
                p-3 rounded-lg text-left min-h-[70px] touch-manipulation transition-all duration-200
                ${
                  selectedFlowers.includes(flower.id)
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{flower.name}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {flower.local ? '🏠 Local' : '✈️ Imported'}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xs px-2 py-1 rounded ${getScoreColor(flower.sustainability)}`}
                  >
                    {Math.round(flower.sustainability * 100)}%
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Season Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Wedding Season
        </label>
        <div className="grid grid-cols-2 gap-2">
          {seasons.map((seasonOption) => (
            <button
              key={seasonOption.id}
              onClick={() => {
                setSeason(seasonOption.id);
                lightHaptic();
              }}
              className={`
                p-3 rounded-lg text-center touch-manipulation transition-all duration-200
                ${
                  season === seasonOption.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="font-medium text-sm">{seasonOption.name}</div>
              <div className="text-xs opacity-75 mt-1">
                {seasonOption.months}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Venue Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Venue Location (Optional)
        </label>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Enter city or region..."
          className="w-full px-3 py-2 rounded-lg border border-gray-300 touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyzeSelection}
        disabled={loading || selectedFlowers.length === 0}
        className="w-full bg-green-500 text-white py-4 rounded-lg font-medium text-lg min-h-[56px] touch-manipulation active:bg-green-600 disabled:bg-gray-400"
        style={{ touchAction: 'manipulation' }}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin mr-2">⏳</span>
            Analyzing Sustainability...
          </span>
        ) : (
          '🌱 Analyze Environmental Impact'
        )}
      </button>

      {/* Sustainability Report */}
      {report && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Overall Score */}
          <div className="text-center pb-4 border-b border-gray-200">
            <div className="text-4xl mb-2">
              {getScoreEmoji(report.overall_score)}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(report.overall_score * 100)}%
            </div>
            <div className="text-sm text-gray-600">
              Overall Sustainability Score
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {Math.round(report.carbon_footprint)}kg
              </div>
              <div className="text-xs text-gray-600">CO₂ Footprint</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {Math.round(report.water_usage)}L
              </div>
              <div className="text-xs text-gray-600">Water Usage</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {Math.round(report.local_sourcing)}%
              </div>
              <div className="text-xs text-gray-600">Local Sourcing</div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Detailed Analysis
            </h4>
            {report.metrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{metric.category}</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getImpactColor(metric.impact)}`}
                    >
                      {metric.impact} impact
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getScoreColor(metric.score)}`}
                    >
                      {Math.round(metric.score * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {metric.description}
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    View suggestions
                  </summary>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    {metric.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>

          {/* Improvements */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">
              Recommended Improvements
            </h4>
            <div className="space-y-1">
              {report.improvements.slice(0, 3).map((improvement, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-600 flex items-start"
                >
                  <span className="text-green-600 mr-2">✓</span>
                  <span>{improvement}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">
              Look for These Certifications
            </h4>
            <div className="flex flex-wrap gap-1">
              {report.certifications.slice(0, 3).map((cert, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  🏆 {cert}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
