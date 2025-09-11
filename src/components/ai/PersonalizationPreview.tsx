'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Users,
  Heart,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Split,
  Edit3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface PersonalizationVariable {
  id: string;
  name: string;
  value: string;
  suggestions: string[];
  confidence: number;
  source:
    | 'wedding_context'
    | 'supplier_brand'
    | 'couple_preference'
    | 'ai_generated';
}

interface PersonalizationMetrics {
  engagement_score: number;
  conversion_probability: number;
  personalization_strength: number;
  readability_score: number;
  brand_alignment: number;
  processing_time_ms: number;
}

interface PersonalizationPreviewProps {
  originalContent: string;
  personalizedContent: string;
  variables: PersonalizationVariable[];
  metrics: PersonalizationMetrics;
  isGenerating?: boolean;
  weddingContext?: {
    venue_type: string;
    wedding_style: string;
    guest_count: number;
    budget_range: string;
    season: string;
  };
  supplierBrand?: {
    voice: string;
    style: string;
    values: string[];
  };
  onVariableUpdate: (variableId: string, newValue: string) => void;
  onRegeneratePreview: () => void;
  onApplyPersonalization: () => void;
  className?: string;
}

const PersonalizationPreview: React.FC<PersonalizationPreviewProps> = ({
  originalContent,
  personalizedContent,
  variables,
  metrics,
  isGenerating = false,
  weddingContext,
  supplierBrand,
  onVariableUpdate,
  onRegeneratePreview,
  onApplyPersonalization,
  className = '',
}) => {
  const [showComparison, setShowComparison] = useState(true);
  const [activeVariable, setActiveVariable] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<
    'split' | 'overlay' | 'metrics'
  >('split');

  // Calculate overall personalization score
  const overallScore = useMemo(() => {
    return Math.round(
      (metrics.engagement_score +
        metrics.conversion_probability +
        metrics.personalization_strength +
        metrics.brand_alignment) /
        4,
    );
  }, [metrics]);

  // Context-aware suggestions based on wedding details
  const contextSuggestions = useMemo(() => {
    if (!weddingContext) return [];

    const suggestions = [];

    if (weddingContext.venue_type === 'beach') {
      suggestions.push(
        'seaside dining experience',
        'coastal ambiance',
        'ocean views',
      );
    } else if (weddingContext.venue_type === 'barn') {
      suggestions.push('rustic charm', 'farm-to-table', 'countryside elegance');
    } else if (weddingContext.venue_type === 'hotel') {
      suggestions.push(
        'luxury service',
        'elegant atmosphere',
        'refined experience',
      );
    }

    if (weddingContext.guest_count < 50) {
      suggestions.push(
        'intimate celebration',
        'personal touch',
        'cozy gathering',
      );
    } else if (weddingContext.guest_count > 150) {
      suggestions.push(
        'grand celebration',
        'memorable spectacle',
        'extensive coordination',
      );
    }

    return suggestions;
  }, [weddingContext]);

  const getMetricColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (score >= 60)
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Personalization Preview</h3>
            <Badge
              variant={
                overallScore >= 80
                  ? 'default'
                  : overallScore >= 60
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {overallScore}% Match
            </Badge>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {metrics.processing_time_ms}ms
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Tabs
            value={previewMode}
            onValueChange={(value) => setPreviewMode(value as any)}
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="split" className="flex items-center gap-1">
                <Split className="w-4 h-4" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="overlay" className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Metrics
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={onRegeneratePreview}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate
          </Button>

          <Button onClick={onApplyPersonalization} disabled={isGenerating}>
            Apply Changes
          </Button>
        </div>
      </div>

      {/* Performance Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Engagement</span>
              </div>
              <span
                className={`text-sm font-bold ${getMetricColor(metrics.engagement_score)}`}
              >
                {metrics.engagement_score}%
              </span>
            </div>
            <Progress value={metrics.engagement_score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Conversion</span>
              </div>
              <span
                className={`text-sm font-bold ${getMetricColor(metrics.conversion_probability)}`}
              >
                {metrics.conversion_probability}%
              </span>
            </div>
            <Progress value={metrics.conversion_probability} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Personal</span>
              </div>
              <span
                className={`text-sm font-bold ${getMetricColor(metrics.personalization_strength)}`}
              >
                {metrics.personalization_strength}%
              </span>
            </div>
            <Progress
              value={metrics.personalization_strength}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Brand</span>
              </div>
              <span
                className={`text-sm font-bold ${getMetricColor(metrics.brand_alignment)}`}
              >
                {metrics.brand_alignment}%
              </span>
            </div>
            <Progress value={metrics.brand_alignment} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Preview Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Preview */}
        <div className="lg:col-span-2">
          {previewMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Original Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {originalContent}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-600" />
                    Personalized Content
                    <Badge variant="outline" className="text-xs">
                      +{overallScore}% better
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {personalizedContent}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {previewMode === 'overlay' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  Personalized Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">{personalizedContent}</div>
              </CardContent>
            </Card>
          )}

          {previewMode === 'metrics' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Readability Score</span>
                    <span className="font-semibold">
                      {metrics.readability_score}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Processing Time</span>
                    <span className="font-semibold">
                      {metrics.processing_time_ms}ms
                    </span>
                  </div>
                </div>

                {/* Context Suggestions */}
                {contextSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Context-Aware Suggestions
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {contextSuggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-blue-100"
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Variables Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Personalization Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.map((variable) => (
                <div key={variable.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {variable.name}
                    </Label>
                    <div className="flex items-center space-x-1">
                      {getMetricIcon(variable.confidence)}
                      <span className="text-xs text-gray-500">
                        {variable.confidence}%
                      </span>
                    </div>
                  </div>

                  <Input
                    value={variable.value}
                    onChange={(e) =>
                      onVariableUpdate(variable.id, e.target.value)
                    }
                    placeholder={`Enter ${variable.name.toLowerCase()}`}
                    className="text-sm"
                  />

                  {variable.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500">
                        Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {variable.suggestions
                          .slice(0, 3)
                          .map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-blue-50"
                              onClick={() =>
                                onVariableUpdate(variable.id, suggestion)
                              }
                            >
                              {suggestion}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center text-xs text-gray-500">
                    <Badge variant="ghost" className="text-xs">
                      {variable.source.replace('_', ' ')}
                    </Badge>
                  </div>

                  {variable.id !== variables[variables.length - 1].id && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Wedding Context Display */}
          {weddingContext && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Wedding Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Venue:</span>
                    <span>{weddingContext.venue_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Style:</span>
                    <span>{weddingContext.wedding_style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guests:</span>
                    <span>{weddingContext.guest_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Season:</span>
                    <span>{weddingContext.season}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizationPreview;
