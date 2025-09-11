'use client';

import React from 'react';
import {
  Star,
  Edit3,
  CheckCircle2,
  Eye,
  BarChart3,
  Copy,
  Trash2,
  Zap,
} from 'lucide-react';
import { TemplateVariantSelectorProps, AIEmailVariant } from '@/types/ai-email';
import { useEmailTemplateStore } from '@/stores/useEmailTemplateStore';

const TemplateVariantSelector: React.FC<TemplateVariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelect,
  onEdit,
  onABTest,
  onPreview,
  showComparison = false,
  comparisonMode = 'side-by-side',
  className = '',
}) => {
  const {
    selectVariant,
    duplicateVariant,
    removeVariant,
    addVariantComparison,
  } = useEmailTemplateStore();

  const [selectedForComparison, setSelectedForComparison] = React.useState<
    string[]
  >([]);
  const [hoveredVariant, setHoveredVariant] = React.useState<string | null>(
    null,
  );

  // Handle variant selection
  const handleVariantSelect = (variant: AIEmailVariant) => {
    selectVariant(variant);
    onSelect(variant);
  };

  // Handle A/B test selection
  const handleABTestSelection = (variantId: string) => {
    setSelectedForComparison((prev) => {
      const isSelected = prev.includes(variantId);
      if (isSelected) {
        return prev.filter((id) => id !== variantId);
      } else if (prev.length < 3) {
        // Limit to 3 variants for A/B testing
        return [...prev, variantId];
      }
      return prev;
    });
  };

  // Launch A/B test with selected variants
  const handleLaunchABTest = () => {
    if (selectedForComparison.length >= 2) {
      const selectedVariants = variants.filter((v) =>
        selectedForComparison.includes(v.id),
      );
      onABTest(selectedVariants);
      setSelectedForComparison([]);
    }
  };

  // Get confidence score color and stars
  const getConfidenceDisplay = (score: number) => {
    const percentage = Math.round(score * 100);
    const stars = Math.round(score * 5);
    let colorClass = 'text-gray-400';

    if (score >= 0.8) colorClass = 'text-success-500';
    else if (score >= 0.6) colorClass = 'text-warning-500';
    else if (score >= 0.4) colorClass = 'text-warning-600';
    else colorClass = 'text-error-500';

    return { percentage, stars, colorClass };
  };

  // Truncate preview text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (variants.length === 0) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 p-8 text-center ${className}`}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <Zap className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Templates Generated
        </h3>
        <p className="text-gray-600 mb-4">
          Generate your first email templates to see variants here.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Template Variants
          </h2>
          <p className="text-sm text-gray-600">
            Choose the best template or select multiple for A/B testing
          </p>
        </div>

        {/* A/B Test Controls */}
        {selectedForComparison.length >= 2 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedForComparison.length} selected for A/B test
            </span>
            <button
              onClick={handleLaunchABTest}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Launch A/B Test
            </button>
          </div>
        )}
      </div>

      {/* Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variants.map((variant, index) => {
          const confidence = getConfidenceDisplay(variant.confidence_score);
          const isSelected = selectedVariant?.id === variant.id;
          const isSelectedForAB = selectedForComparison.includes(variant.id);
          const isHovered = hoveredVariant === variant.id;

          return (
            <div
              key={variant.id}
              className={`relative bg-white border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group ${
                isSelected
                  ? 'border-primary-300 ring-4 ring-primary-100 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              } ${
                isSelectedForAB ? 'ring-2 ring-warning-300 bg-warning-50' : ''
              }`}
              onClick={() => handleVariantSelect(variant)}
              onMouseEnter={() => setHoveredVariant(variant.id)}
              onMouseLeave={() => setHoveredVariant(null)}
            >
              {/* Variant Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                    Variant {variant.variant_number}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-success-500" />
                  )}
                </div>

                {/* A/B Test Checkbox */}
                <label
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelectedForAB}
                    onChange={() => handleABTestSelection(variant.id)}
                    className="w-4 h-4 text-warning-600 bg-white border-gray-300 rounded focus:ring-warning-500 focus:ring-2"
                  />
                  <span className="ml-2 text-xs text-gray-600">A/B Test</span>
                </label>
              </div>

              {/* Confidence Score */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < confidence.stars
                          ? confidence.colorClass
                          : 'text-gray-200'
                      } fill-current`}
                    />
                  ))}
                </div>
                <span
                  className={`text-xs font-medium ${confidence.colorClass}`}
                >
                  {confidence.percentage}% confidence
                </span>
              </div>

              {/* Subject Line */}
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Subject:
                </h4>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {truncateText(variant.subject, 60)}
                </p>
              </div>

              {/* Content Preview */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Preview:
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {truncateText(variant.content.replace(/<[^>]*>/g, ''), 120)}
                </p>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs font-medium text-gray-900">
                    {variant.word_count}
                  </div>
                  <div className="text-xs text-gray-600">words</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs font-medium text-gray-900">
                    {variant.estimated_read_time}m
                  </div>
                  <div className="text-xs text-gray-600">read</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs font-medium text-gray-900">
                    {Math.round(variant.sentiment_score * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">sentiment</div>
                </div>
              </div>

              {/* AI Insights Preview */}
              {variant.ai_insights.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Key Strength:
                  </h4>
                  <p className="text-xs text-success-700 bg-success-50 px-2 py-1 rounded">
                    {variant.ai_insights.strengths[0]}
                  </p>
                </div>
              )}

              {/* Action Buttons - Show on hover or selection */}
              <div
                className={`flex items-center gap-2 transition-opacity duration-200 ${
                  isSelected || isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(variant);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(variant);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary-100 hover:bg-primary-200 text-primary-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>

                {/* Dropdown menu for more actions */}
                <div className="relative">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  >
                    <div className="w-1 h-1 bg-current rounded-full mb-1"></div>
                    <div className="w-1 h-1 bg-current rounded-full mb-1"></div>
                    <div className="w-1 h-1 bg-current rounded-full"></div>
                  </button>

                  {/* Dropdown menu - would typically use a proper dropdown component */}
                  {isHovered && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateVariant(variant.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="w-3 h-3" />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVariant(variant.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error-700 hover:bg-error-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-success-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}

              {/* A/B Test Indicator */}
              {isSelectedForAB && (
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-warning-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison View Toggle */}
      {showComparison && selectedForComparison.length >= 2 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Variant Comparison
          </h3>

          {/* Comparison Mode Selector */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">View:</span>
            {['side-by-side', 'overlay', 'diff'].map((mode) => (
              <button
                key={mode}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${
                  comparisonMode === mode
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Comparison Content */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 text-center">
              Detailed comparison view would be implemented here based on
              comparisonMode
            </p>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Pro Tip:</strong> Select multiple variants to run A/B tests
          and see which performs better with your clients. Higher confidence
          scores indicate the AI's assessment of template quality.
        </p>
      </div>
    </div>
  );
};

export default TemplateVariantSelector;
