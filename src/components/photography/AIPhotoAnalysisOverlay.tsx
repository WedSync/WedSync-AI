'use client';

// WS-130: AI-Powered Photography Library - AI Analysis Overlay
// Team C Batch 10 Round 1

import React, { useState } from 'react';
import {
  Brain,
  Palette,
  Camera,
  Heart,
  Zap,
  Eye,
  Layers,
  Target,
  TrendingUp,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PhotoStyleAnalysis } from './PhotographerPortfolioGallery';

interface AIPhotoAnalysisOverlayProps {
  analysis: PhotoStyleAnalysis;
  photoUrl: string;
  photoTitle?: string;
  isVisible: boolean;
  onClose: () => void;
  onStyleClick?: (styleName: string) => void;
  showRecommendations?: boolean;
  className?: string;
}

type AnalysisSection =
  | 'styles'
  | 'colors'
  | 'composition'
  | 'mood'
  | 'technical'
  | 'recommendations';

export function AIPhotoAnalysisOverlay({
  analysis,
  photoUrl,
  photoTitle,
  isVisible,
  onClose,
  onStyleClick,
  showRecommendations = true,
  className = '',
}: AIPhotoAnalysisOverlayProps) {
  const [activeSection, setActiveSection] = useState<AnalysisSection>('styles');
  const [expandedSections, setExpandedSections] = useState<
    Set<AnalysisSection>
  >(new Set(['styles']));

  if (!isVisible) return null;

  const toggleSection = (section: AnalysisSection) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 0.4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getLightingIcon = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-500" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'fair':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  const generateRecommendations = () => {
    const recommendations = [];

    // Style-based recommendations
    const topStyle = analysis.detected_styles[0];
    if (topStyle && topStyle.confidence < 0.7) {
      recommendations.push({
        type: 'style',
        title: 'Style Enhancement',
        description: `Consider emphasizing ${topStyle.style_name} characteristics to strengthen this style identity.`,
        icon: <Palette className="h-4 w-4" />,
      });
    }

    // Technical recommendations
    if (analysis.technical_analysis.composition_score < 7) {
      recommendations.push({
        type: 'technical',
        title: 'Composition Improvement',
        description:
          'Consider applying rule of thirds or leading lines to enhance visual impact.',
        icon: <Camera className="h-4 w-4" />,
      });
    }

    // Color recommendations
    if (analysis.color_analysis.color_harmony === 'poor') {
      recommendations.push({
        type: 'color',
        title: 'Color Harmony',
        description:
          'Adjust color grading to create more harmonious color relationships.',
        icon: <Palette className="h-4 w-4" />,
      });
    }

    // Mood recommendations
    if (analysis.mood_analysis.emotion_score < 0.6) {
      recommendations.push({
        type: 'mood',
        title: 'Emotional Impact',
        description:
          'Consider post-processing techniques to enhance the emotional resonance.',
        icon: <Heart className="h-4 w-4" />,
      });
    }

    return recommendations.slice(0, 3);
  };

  const recommendations = showRecommendations ? generateRecommendations() : [];

  return (
    <div
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Brain className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Photo Analysis</h3>
              <p className="text-sm text-gray-600">
                {photoTitle || 'Untitled Photo'}
              </p>
            </div>
          </div>

          <Button variant="tertiary" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Photo Preview */}
          <div className="w-1/2 relative bg-gray-100 flex items-center justify-center">
            <img
              src={photoUrl}
              alt={photoTitle || 'Photo preview'}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Analysis Content */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'styles', label: 'Styles', icon: Palette },
                  { id: 'colors', label: 'Colors', icon: Palette },
                  { id: 'composition', label: 'Composition', icon: Camera },
                  { id: 'mood', label: 'Mood', icon: Heart },
                  { id: 'technical', label: 'Technical', icon: Layers },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id as AnalysisSection)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                      activeSection === id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Style Analysis */}
              {activeSection === 'styles' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Detected Styles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.detected_styles.map((style, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <button
                            onClick={() => onStyleClick?.(style.style_name)}
                            className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                          >
                            {style.style_name}
                          </button>
                          <div className="mt-1">
                            <Progress
                              value={style.confidence * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(style.confidence)}`}
                        >
                          {Math.round(style.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Color Analysis */}
              {activeSection === 'colors' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Color Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Dominant Colors</h4>
                      <div className="flex gap-2">
                        {analysis.color_analysis.dominant_colors.map(
                          (color, index) => (
                            <div
                              key={index}
                              className="flex flex-col items-center"
                            >
                              <div
                                className="w-8 h-8 rounded-full border border-gray-300"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs text-gray-600 mt-1">
                                {color}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Color Harmony
                        </span>
                        <Badge
                          variant={
                            analysis.color_analysis.color_harmony ===
                            'excellent'
                              ? 'success'
                              : 'secondary'
                          }
                          className="ml-2"
                        >
                          {analysis.color_analysis.color_harmony}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Saturation
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {analysis.color_analysis.saturation_level}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Brightness
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {analysis.color_analysis.brightness_level}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Composition Analysis */}
              {activeSection === 'composition' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Composition Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">
                          Rule of Thirds
                        </span>
                        <Badge
                          variant={
                            analysis.composition_analysis.rule_of_thirds
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {analysis.composition_analysis.rule_of_thirds
                            ? 'Yes'
                            : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">
                          Leading Lines
                        </span>
                        <Badge
                          variant={
                            analysis.composition_analysis.leading_lines
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {analysis.composition_analysis.leading_lines
                            ? 'Yes'
                            : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Symmetry</span>
                        <Badge
                          variant={
                            analysis.composition_analysis.symmetry
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {analysis.composition_analysis.symmetry
                            ? 'Yes'
                            : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">
                          Depth of Field
                        </span>
                        <Badge variant="secondary">
                          {analysis.composition_analysis.depth_of_field}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mood Analysis */}
              {activeSection === 'mood' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Mood Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Emotional Impact</span>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.mood_analysis.emotion_score)}`}
                      >
                        {Math.round(analysis.mood_analysis.emotion_score * 100)}
                        %
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Detected Moods</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.mood_analysis.mood_tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Energy Level</span>
                      <Badge variant="secondary">
                        {analysis.mood_analysis.energy_level}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Analysis */}
              {activeSection === 'technical' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Technical Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getLightingIcon(
                            analysis.technical_analysis.lighting_quality,
                          )}
                          <span className="font-medium">Lighting Quality</span>
                        </div>
                        <Badge variant="secondary">
                          {analysis.technical_analysis.lighting_quality}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Focus Quality</span>
                        </div>
                        <Badge variant="secondary">
                          {analysis.technical_analysis.focus_quality}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Overall Score</span>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.technical_analysis.composition_score / 10)}`}
                        >
                          {analysis.technical_analysis.composition_score}/10
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendations */}
              {recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex-shrink-0 p-1 bg-blue-100 rounded">
                            {rec.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-900 text-sm">
                              {rec.title}
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis Metadata */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Analysis generated:{' '}
                      {new Date(analysis.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      <span>AI-Powered</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
