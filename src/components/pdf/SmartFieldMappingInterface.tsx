'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heading } from '@/components/ui/heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  X,
  AlertTriangle,
  Zap,
  Brain,
  Target,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Star,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface ExtractedField {
  id: string;
  name: string;
  value: string;
  type: string;
  confidence: number;
  position?: any;
  context?: string[];
}

interface SmartMapping {
  id: string;
  sourceFieldId: string;
  targetFieldId: string;
  confidence: number;
  mappingType: 'exact' | 'semantic' | 'pattern' | 'contextual' | 'learned';
  reasoning: string;
  alternatives?: Array<{
    targetFieldId: string;
    confidence: number;
    reasoning: string;
  }>;
}

interface MappingSuggestion {
  type: 'merge' | 'split' | 'transform' | 'validate';
  description: string;
  fieldIds: string[];
  confidence: number;
}

interface SmartFieldMappingInterfaceProps {
  documentId: string;
  extractedFields: ExtractedField[];
  onMappingComplete: (mappings: any[], accuracy: number) => void;
  onSaveTemplate?: (templateData: any) => void;
  isLoading?: boolean;
}

export function SmartFieldMappingInterface({
  documentId,
  extractedFields,
  onMappingComplete,
  onSaveTemplate,
  isLoading = false,
}: SmartFieldMappingInterfaceProps) {
  // State management
  const [smartMappings, setSmartMappings] = useState<SmartMapping[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('smart');
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [manualMappings, setManualMappings] = useState<Record<string, string>>(
    {},
  );
  const [correctedMappings, setCorrectedMappings] = useState<Set<string>>(
    new Set(),
  );
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // AI Analysis options
  const [aiOptions, setAiOptions] = useState({
    enableSemanticMatching: true,
    enableLearningMode: true,
    includeContextAnalysis: true,
    prioritizeAccuracy: true,
  });

  // Wedding core fields schema
  const WEDDING_CORE_FIELDS = [
    {
      id: 'bride_name',
      label: 'Bride Name',
      type: 'text',
      required: true,
      icon: '👰',
    },
    {
      id: 'groom_name',
      label: 'Groom Name',
      type: 'text',
      required: true,
      icon: '🤵',
    },
    {
      id: 'wedding_date',
      label: 'Wedding Date',
      type: 'date',
      required: true,
      icon: '📅',
    },
    {
      id: 'venue_name',
      label: 'Venue Name',
      type: 'text',
      required: false,
      icon: '🏛️',
    },
    {
      id: 'venue_address',
      label: 'Venue Address',
      type: 'address',
      required: false,
      icon: '📍',
    },
    {
      id: 'primary_email',
      label: 'Primary Email',
      type: 'email',
      required: true,
      icon: '📧',
    },
    {
      id: 'primary_phone',
      label: 'Primary Phone',
      type: 'phone',
      required: true,
      icon: '📞',
    },
    {
      id: 'guest_count',
      label: 'Guest Count',
      type: 'number',
      required: false,
      icon: '👥',
    },
    {
      id: 'budget',
      label: 'Wedding Budget',
      type: 'currency',
      required: false,
      icon: '💰',
    },
    {
      id: 'ceremony_time',
      label: 'Ceremony Time',
      type: 'time',
      required: false,
      icon: '⏰',
    },
  ];

  // Perform AI analysis
  const performAIAnalysis = useCallback(async () => {
    if (!extractedFields.length) return;

    setIsAnalyzing(true);
    setMappingErrors([]);

    try {
      const response = await fetch('/api/document-processing/mapping/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          options: {
            confidenceThreshold,
            ...aiOptions,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSmartMappings(result.data.mappings || []);
        setSuggestions(result.data.suggestions || []);
        setAccuracy(result.data.accuracy || 0);
      } else {
        setMappingErrors([result.error || 'Analysis failed']);
      }
    } catch (error) {
      setMappingErrors(['Failed to connect to mapping service']);
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [documentId, extractedFields, confidenceThreshold, aiOptions]);

  // Load mapping templates
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/document-processing/mapping/templates?targetSchema=wedding_default',
      );
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  // Apply template
  const applyTemplate = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      // Map template mappings to current fields
      const templateMappings: SmartMapping[] = [];

      template.mappings.forEach((mapping: any) => {
        const sourceField = extractedFields.find(
          (f) =>
            f.name
              .toLowerCase()
              .includes(mapping.sourceFieldId.toLowerCase()) ||
            mapping.sourceFieldId.toLowerCase().includes(f.name.toLowerCase()),
        );

        if (sourceField) {
          templateMappings.push({
            id: `${sourceField.id}_${mapping.targetFieldId}`,
            sourceFieldId: sourceField.id,
            targetFieldId: mapping.targetFieldId,
            confidence: Math.min(mapping.confidence, 0.9),
            mappingType: 'learned',
            reasoning: `Applied from template: ${template.name}`,
            alternatives: [],
          });
        }
      });

      setSmartMappings(templateMappings);
      setAccuracy(template.accuracy || 0);
      setSelectedTemplate(templateId);
    } catch (error) {
      console.error('Failed to apply template:', error);
      setMappingErrors(['Failed to apply template']);
    }
  };

  // Handle mapping correction
  const handleMappingCorrection = async (
    mappingId: string,
    newTargetId: string,
    feedback: 'correct' | 'incorrect' | 'partial',
  ) => {
    const mapping = smartMappings.find((m) => m.id === mappingId);
    if (!mapping) return;

    try {
      // Submit correction to learning system
      await fetch('/api/document-processing/mapping/correct', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          corrections: [
            {
              mappingId,
              correctTargetFieldId: newTargetId,
              feedback,
              userConfidence: 0.9,
              documentId,
              sourceFieldId: mapping.sourceFieldId,
            },
          ],
        }),
      });

      // Update local mapping
      setSmartMappings((prev) =>
        prev.map((m) =>
          m.id === mappingId
            ? { ...m, targetFieldId: newTargetId, confidence: 0.9 }
            : m,
        ),
      );

      setCorrectedMappings((prev) => new Set(prev.add(mappingId)));
    } catch (error) {
      console.error('Failed to submit correction:', error);
    }
  };

  // Apply mappings and create form
  const applyMappings = async () => {
    const finalMappings = [
      ...smartMappings.map((m) => ({
        sourceFieldId: m.sourceFieldId,
        targetFieldId: m.targetFieldId,
        confidence: m.confidence,
        confirmed: true,
      })),
      ...Object.entries(manualMappings).map(([sourceId, targetId]) => ({
        sourceFieldId: sourceId,
        targetFieldId: targetId,
        confidence: 1.0,
        confirmed: true,
      })),
    ];

    try {
      const response = await fetch('/api/document-processing/mapping/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          mappings: finalMappings,
          options: {
            createRecord: true,
            validateData: true,
            generateForm: true,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        onMappingComplete(
          result.data.appliedMappings,
          result.data.metrics.successRate,
        );
      } else {
        setMappingErrors([result.error || 'Failed to apply mappings']);
      }
    } catch (error) {
      console.error('Failed to apply mappings:', error);
      setMappingErrors(['Failed to apply mappings']);
    }
  };

  // Save as template
  const saveAsTemplate = async () => {
    if (!onSaveTemplate) return;

    const templateData = {
      documentId,
      templateName: `Template-${new Date().toISOString().split('T')[0]}`,
      mappings: smartMappings.map((m) => ({
        sourceFieldId: m.sourceFieldId,
        targetFieldId: m.targetFieldId,
        confidence: m.confidence,
        mappingType: m.mappingType,
        reasoning: m.reasoning,
      })),
      accuracy,
      isPublic: false,
    };

    onSaveTemplate(templateData);
  };

  // Initialize
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (extractedFields.length > 0) {
      performAIAnalysis();
    }
  }, [extractedFields, performAIAnalysis]);

  // Filter mappings based on confidence threshold
  const filteredMappings = smartMappings.filter(
    (m) => showLowConfidence || m.confidence >= confidenceThreshold,
  );

  // Calculate completion stats
  const requiredFields = WEDDING_CORE_FIELDS.filter((f) => f.required);
  const mappedRequired = requiredFields.filter(
    (f) =>
      smartMappings.some((m) => m.targetFieldId === f.id) ||
      Object.values(manualMappings).includes(f.id),
  );

  const completionStats = {
    required: mappedRequired.length,
    totalRequired: requiredFields.length,
    total: smartMappings.length + Object.keys(manualMappings).length,
    accuracy: Math.round(accuracy * 100),
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI-Powered Field Mapping
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Intelligent field mapping with machine learning
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredMappings.length}
                </div>
                <div className="text-xs text-gray-600">Smart Mappings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {completionStats.required}/{completionStats.totalRequired}
                </div>
                <div className="text-xs text-gray-600">Required Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {completionStats.accuracy}%
                </div>
                <div className="text-xs text-gray-600">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Mapping Progress</span>
              <span>
                {completionStats.required}/{completionStats.totalRequired}{' '}
                required fields mapped
              </span>
            </div>
            <Progress
              value={
                (completionStats.required / completionStats.totalRequired) * 100
              }
              className="h-2"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {mappingErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{mappingErrors.join(', ')}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Smart Mapping
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Manual Review
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Smart Mapping Tab */}
        <TabsContent value="smart" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={performAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Re-analyze Fields'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLowConfidence(!showLowConfidence)}
                >
                  {showLowConfidence ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showLowConfidence ? 'Hide Low Confidence' : 'Show All'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Confidence Threshold:</label>
              <Input
                type="range"
                min="0.5"
                max="1.0"
                step="0.1"
                value={confidenceThreshold}
                onChange={(e) =>
                  setConfidenceThreshold(parseFloat(e.target.value))
                }
                className="w-20"
              />
              <span className="text-sm w-12">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
          </div>

          {/* Smart Mappings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Wedding Form Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {WEDDING_CORE_FIELDS.map((field) => {
                  const mapping = smartMappings.find(
                    (m) => m.targetFieldId === field.id,
                  );
                  const sourceField = mapping
                    ? extractedFields.find(
                        (f) => f.id === mapping.sourceFieldId,
                      )
                    : null;

                  return (
                    <div
                      key={field.id}
                      className={`p-3 border rounded-lg transition-all ${
                        mapping
                          ? 'bg-green-50 border-green-200'
                          : field.required
                            ? 'bg-red-50 border-red-200'
                            : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{field.icon}</span>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {field.label}
                              {field.required && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                            {mapping && sourceField && (
                              <div className="flex items-center gap-2 mt-1">
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {sourceField.value}
                                </span>
                                <Badge
                                  variant={
                                    mapping.confidence >= 0.8
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {Math.round(mapping.confidence * 100)}%
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {mapping.mappingType}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {mapping && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleMappingCorrection(
                                  mapping.id,
                                  mapping.targetFieldId,
                                  'correct',
                                )
                              }
                              className="text-green-600 hover:text-green-700"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleMappingCorrection(
                                  mapping.id,
                                  mapping.targetFieldId,
                                  'incorrect',
                                )
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {mapping && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>AI Reasoning:</strong> {mapping.reasoning}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Source Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Extracted Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {extractedFields.map((field) => {
                  const isMapped = smartMappings.some(
                    (m) => m.sourceFieldId === field.id,
                  );

                  return (
                    <div
                      key={field.id}
                      className={`p-3 border rounded-lg ${isMapped ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              field.confidence >= 0.8 ? 'default' : 'secondary'
                            }
                            className="flex items-center gap-1"
                          >
                            {field.confidence >= 0.8 ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {Math.round(field.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {isMapped && (
                            <Badge variant="default" className="text-xs">
                              Mapped
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {field.name}
                        </div>
                        <div className="text-gray-600 break-all text-sm">
                          {field.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Alert key={index}>
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>{suggestion.description}</span>
                        <Badge variant="outline">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Templates</CardTitle>
              <p className="text-sm text-gray-600">
                Apply pre-configured mapping templates or save your current
                mappings
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-600">
                        {template.description}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">
                          {Math.round(template.accuracy * 100)}% accuracy
                        </Badge>
                        <Badge variant="outline">
                          {template.usageCount} uses
                        </Badge>
                        {template.userInteraction?.isOwner && (
                          <Badge variant="default">Your Template</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.statistics?.usageCount > 10 && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                      <Button size="sm" variant="outline">
                        Apply Template
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No templates available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Review Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Field Review</CardTitle>
              <p className="text-sm text-gray-600">
                Review and manually adjust AI-generated mappings
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMappings.map((mapping) => {
                  const sourceField = extractedFields.find(
                    (f) => f.id === mapping.sourceFieldId,
                  );
                  const targetField = WEDDING_CORE_FIELDS.find(
                    (f) => f.id === mapping.targetFieldId,
                  );

                  return (
                    <div key={mapping.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              mapping.confidence >= 0.8
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {Math.round(mapping.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline">{mapping.mappingType}</Badge>
                          {correctedMappings.has(mapping.id) && (
                            <Badge variant="default">User Corrected</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleMappingCorrection(
                                mapping.id,
                                mapping.targetFieldId,
                                'correct',
                              )
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleMappingCorrection(
                                mapping.id,
                                mapping.targetFieldId,
                                'incorrect',
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <strong>Source:</strong>
                          <div className="mt-1 p-2 bg-gray-50 rounded">
                            <div className="font-medium">
                              {sourceField?.name}
                            </div>
                            <div className="text-gray-600">
                              {sourceField?.value}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <ArrowRight className="h-6 w-6 text-gray-400" />
                        </div>

                        <div>
                          <strong>Target:</strong>
                          <div className="mt-1 p-2 bg-green-50 rounded">
                            <div className="font-medium flex items-center gap-2">
                              {targetField?.icon} {targetField?.label}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>AI Reasoning:</strong> {mapping.reasoning}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Settings</CardTitle>
              <p className="text-sm text-gray-600">
                Configure AI mapping behavior and preferences
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={aiOptions.enableSemanticMatching}
                    onChange={(e) =>
                      setAiOptions((prev) => ({
                        ...prev,
                        enableSemanticMatching: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">Enable Semantic Matching</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={aiOptions.enableLearningMode}
                    onChange={(e) =>
                      setAiOptions((prev) => ({
                        ...prev,
                        enableLearningMode: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">Enable Learning Mode</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={aiOptions.includeContextAnalysis}
                    onChange={(e) =>
                      setAiOptions((prev) => ({
                        ...prev,
                        includeContextAnalysis: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">Include Context Analysis</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={aiOptions.prioritizeAccuracy}
                    onChange={(e) =>
                      setAiOptions((prev) => ({
                        ...prev,
                        prioritizeAccuracy: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm">Prioritize Accuracy</span>
                </label>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={performAIAnalysis} className="w-full">
                  Re-run Analysis with New Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {completionStats.required < completionStats.totalRequired ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {completionStats.totalRequired - completionStats.required}{' '}
                    required fields still need mapping
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  All required fields are mapped
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {onSaveTemplate && (
                <Button
                  variant="outline"
                  onClick={saveAsTemplate}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save as Template
                </Button>
              )}

              <Button
                onClick={applyMappings}
                disabled={
                  completionStats.required < completionStats.totalRequired ||
                  isLoading
                }
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                Apply Mappings & Create Form
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
