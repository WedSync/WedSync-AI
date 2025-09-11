'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Camera,
  FileText,
  MessageCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Zap,
  Star,
  Settings,
  Save,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type {
  ModelSelectionOptimizerProps,
  ModelSelectionConfig,
} from '@/types/ai-optimization';

// Model definitions with costs and capabilities
const MODEL_DEFINITIONS = {
  'gpt-4': {
    name: 'GPT-4',
    costPerRequest: 8, // pence
    qualityScore: 95,
    speedScore: 70,
    description: 'Highest quality, best for client-facing content',
    bestFor: ['Client proposals', 'Wedding content', 'Complex analysis'],
    weddingUseCase:
      'Perfect for client emails, wedding descriptions, and premium content',
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    costPerRequest: 2, // pence
    qualityScore: 80,
    speedScore: 90,
    description: 'Balanced quality and cost, great for most tasks',
    bestFor: ['Internal notes', 'Bulk operations', 'General content'],
    weddingUseCase:
      'Ideal for vendor communications, internal notes, and routine tasks',
  },
  'gpt-3.5-turbo-instruct': {
    name: 'GPT-3.5 Instruct',
    costPerRequest: 1, // pence
    qualityScore: 75,
    speedScore: 95,
    description: 'Most cost-effective, suitable for simple tasks',
    bestFor: ['Data processing', 'Simple categorization', 'Templates'],
    weddingUseCase:
      'Great for categorizing photos, simple data entry, and bulk processing',
  },
  'gpt-4-vision': {
    name: 'GPT-4 Vision',
    costPerRequest: 12, // pence
    qualityScore: 98,
    speedScore: 60,
    description: 'Premium model for image analysis',
    bestFor: ['Photo analysis', 'Visual content', 'Style matching'],
    weddingUseCase:
      'Exceptional for wedding photo tagging, style analysis, and client galleries',
  },
};

const ModelSelectionOptimizer: React.FC<ModelSelectionOptimizerProps> = ({
  config,
  costProjections,
  onConfigUpdate,
  className,
}) => {
  const [localConfig, setLocalConfig] = useState<ModelSelectionConfig>(config);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Format currency
  const formatPence = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Calculate cost savings for different model configurations
  const calculateMonthlySavings = () => {
    const baselineCost = 15000; // £150/month baseline with all GPT-4
    let optimizedCost = 0;

    // Photography costs (assume 150 requests/month)
    const photographyCost =
      150 *
      MODEL_DEFINITIONS[
        localConfig.photography.model as keyof typeof MODEL_DEFINITIONS
      ].costPerRequest;

    // Content generation costs (assume 100 client-facing, 200 internal, 50 bulk)
    const clientContentCost =
      100 *
      MODEL_DEFINITIONS[
        localConfig.contentGeneration
          .clientFacing as keyof typeof MODEL_DEFINITIONS
      ].costPerRequest;
    const internalContentCost =
      200 *
      MODEL_DEFINITIONS[
        localConfig.contentGeneration.internal as keyof typeof MODEL_DEFINITIONS
      ].costPerRequest;
    const bulkContentCost =
      50 *
      MODEL_DEFINITIONS[
        localConfig.contentGeneration.bulk as keyof typeof MODEL_DEFINITIONS
      ].costPerRequest;

    // Chatbot costs (assume 300 messages/month)
    const chatbotCost =
      300 *
      MODEL_DEFINITIONS[
        localConfig.chatbot.model as keyof typeof MODEL_DEFINITIONS
      ].costPerRequest;

    optimizedCost =
      photographyCost +
      clientContentCost +
      internalContentCost +
      bulkContentCost +
      chatbotCost;

    return {
      baseline: baselineCost,
      optimized: optimizedCost,
      savings: baselineCost - optimizedCost,
      percentage: ((baselineCost - optimizedCost) / baselineCost) * 100,
    };
  };

  // Update configuration
  const updateConfig = (updates: Partial<ModelSelectionConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  // Update nested configuration
  const updateNestedConfig = <T extends keyof ModelSelectionConfig>(
    section: T,
    updates: Partial<ModelSelectionConfig[T]>,
  ) => {
    const newConfig = {
      ...localConfig,
      [section]: { ...localConfig[section], ...updates },
    };
    setLocalConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  // Save configuration
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onConfigUpdate(localConfig);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save model configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset configuration
  const handleReset = () => {
    setLocalConfig(config);
    setHasUnsavedChanges(false);
  };

  // Get model recommendation based on usage patterns
  const getModelRecommendation = (useCase: string): string => {
    switch (useCase) {
      case 'client-facing':
        return 'Use GPT-4 for maximum quality and client satisfaction';
      case 'internal':
        return 'GPT-3.5 Turbo offers the best balance of quality and cost';
      case 'bulk':
        return 'GPT-3.5 Instruct is most cost-effective for large volumes';
      case 'photography':
        return 'GPT-4 Vision provides superior image analysis capabilities';
      default:
        return 'Consider your quality vs cost requirements';
    }
  };

  const monthlySavings = calculateMonthlySavings();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Model Selection Optimizer
          </h2>
          <p className="text-gray-600">
            Balance AI quality and costs with smart model selection
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {monthlySavings.savings > 0 && (
            <Badge className="bg-green-500 text-white">
              <TrendingDown className="h-4 w-4 mr-1" />
              Save {formatPence(monthlySavings.savings)}/month
            </Badge>
          )}
          {hasUnsavedChanges && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cost Impact Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPence(monthlySavings.optimized)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              With current configuration
            </div>
            {monthlySavings.savings > 0 && (
              <div className="text-xs text-green-600 mt-1">
                ↓ {formatPence(monthlySavings.savings)} vs all GPT-4
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cost Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {monthlySavings.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Compared to premium models
            </div>
            <div className="text-xs text-green-600 mt-1">
              {formatPence(monthlySavings.savings * 12)}/year projected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Wedding Season Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPence(monthlySavings.optimized * 1.6)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Peak season cost (1.6x)
            </div>
            <div className="text-xs text-orange-600 mt-1">
              March-October months
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Configuration Cards */}
      <div className="space-y-6">
        {/* Photography AI Configuration */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-500" />
              <span>Photography AI Models</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Image processing, tagging, and visual analysis for wedding photos
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="photographyModel">Photography Model</Label>
              <Select
                value={localConfig.photography.model}
                onValueChange={(value) =>
                  updateNestedConfig('photography', {
                    model: value as 'gpt-4-vision' | 'gpt-3.5-turbo',
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4-vision">
                    GPT-4 Vision -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-4-vision'].costPerRequest,
                    )}
                    /request
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo'].costPerRequest,
                    )}
                    /request
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Recommendation:</strong>{' '}
                    {getModelRecommendation('photography')}
                  </div>
                </div>
              </div>

              {/* Model comparison for photography */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {['gpt-4-vision', 'gpt-3.5-turbo'].map((model) => {
                  const modelInfo =
                    MODEL_DEFINITIONS[model as keyof typeof MODEL_DEFINITIONS];
                  const isSelected = localConfig.photography.model === model;

                  return (
                    <div
                      key={model}
                      className={`p-3 rounded-lg border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{modelInfo.name}</span>
                        <Badge variant={isSelected ? 'default' : 'secondary'}>
                          {formatPence(modelInfo.costPerRequest)}/req
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Quality:</span>
                          <span>{modelInfo.qualityScore}%</span>
                        </div>
                        <Progress
                          value={modelInfo.qualityScore}
                          className="h-1"
                        />
                      </div>

                      <p className="text-xs text-gray-600 mt-2">
                        {modelInfo.weddingUseCase}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Generation Configuration */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span>Content Generation Models</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Email templates, proposals, descriptions, and written content
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client-Facing Content */}
            <div>
              <Label htmlFor="clientFacingModel">Client-Facing Content</Label>
              <p className="text-xs text-gray-600 mb-2">
                Emails to clients, proposals, wedding descriptions
              </p>
              <Select
                value={localConfig.contentGeneration.clientFacing}
                onValueChange={(value) =>
                  updateNestedConfig('contentGeneration', {
                    clientFacing: value as 'gpt-4' | 'gpt-3.5-turbo',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">
                    GPT-4 -{' '}
                    {formatPence(MODEL_DEFINITIONS['gpt-4'].costPerRequest)}
                    /request (Recommended)
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo'].costPerRequest,
                    )}
                    /request
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Internal Content */}
            <div>
              <Label htmlFor="internalModel">Internal Communications</Label>
              <p className="text-xs text-gray-600 mb-2">
                Internal notes, vendor communications, planning documents
              </p>
              <Select
                value={localConfig.contentGeneration.internal}
                onValueChange={(value) =>
                  updateNestedConfig('contentGeneration', {
                    internal: value as 'gpt-4' | 'gpt-3.5-turbo',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">
                    GPT-4 -{' '}
                    {formatPence(MODEL_DEFINITIONS['gpt-4'].costPerRequest)}
                    /request
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo'].costPerRequest,
                    )}
                    /request (Recommended)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Operations */}
            <div>
              <Label htmlFor="bulkModel">Bulk Operations</Label>
              <p className="text-xs text-gray-600 mb-2">
                Data processing, categorization, template generation
              </p>
              <Select
                value={localConfig.contentGeneration.bulk}
                onValueChange={(value) =>
                  updateNestedConfig('contentGeneration', {
                    bulk: value as 'gpt-3.5-turbo' | 'gpt-3.5-turbo-instruct',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo'].costPerRequest,
                    )}
                    /request
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo-instruct">
                    GPT-3.5 Instruct -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo-instruct']
                        .costPerRequest,
                    )}
                    /request (Recommended)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Chatbot Configuration */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              <span>Chatbot Configuration</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Client inquiries, FAQ responses, and automated interactions
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chatbotModel">Primary Chatbot Model</Label>
              <Select
                value={localConfig.chatbot.model}
                onValueChange={(value) =>
                  updateNestedConfig('chatbot', {
                    model: value as 'gpt-4' | 'gpt-3.5-turbo',
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">
                    GPT-4 -{' '}
                    {formatPence(MODEL_DEFINITIONS['gpt-4'].costPerRequest)}
                    /request
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo -{' '}
                    {formatPence(
                      MODEL_DEFINITIONS['gpt-3.5-turbo'].costPerRequest,
                    )}
                    /request (Recommended)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">
                Chatbot Optimization Tips:
              </h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>
                  • GPT-3.5 Turbo handles most wedding inquiries effectively
                </li>
                <li>• Use caching for frequently asked questions</li>
                <li>• Fallback to GPT-4 for complex booking scenarios</li>
                <li>• Monitor conversation quality vs cost balance</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Advanced Model Settings</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </Button>
          </div>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-4">
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Advanced settings can significantly impact costs and
                performance. Test changes carefully before applying to
                production workflows.
              </AlertDescription>
            </Alert>

            {/* Quality Threshold */}
            <div>
              <Label htmlFor="qualityThreshold">
                Photography Quality Threshold
              </Label>
              <p className="text-xs text-gray-600 mb-2">
                Minimum quality score to trigger premium model usage
              </p>
              <div className="px-3">
                <Slider
                  value={[localConfig.photography.qualityThreshold]}
                  onValueChange={([value]) =>
                    updateNestedConfig('photography', {
                      qualityThreshold: value,
                    })
                  }
                  min={70}
                  max={95}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Lower Cost (70)</span>
                <span>Current: {localConfig.photography.qualityThreshold}</span>
                <span>Higher Quality (95)</span>
              </div>
            </div>

            {/* Context Length */}
            <div>
              <Label htmlFor="contextLength">Chatbot Context Length</Label>
              <p className="text-xs text-gray-600 mb-2">
                Maximum tokens for conversation context (longer = more
                expensive)
              </p>
              <Select
                value={localConfig.chatbot.contextLength.toString()}
                onValueChange={(value) =>
                  updateNestedConfig('chatbot', {
                    contextLength: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024">1K tokens (Basic)</SelectItem>
                  <SelectItem value="2048">2K tokens (Standard)</SelectItem>
                  <SelectItem value="4096">4K tokens (Extended)</SelectItem>
                  <SelectItem value="8192">8K tokens (Maximum)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                Higher values remember more conversation history but cost more
                per interaction
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Wedding Industry Optimization Guide */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-orange-600" />
            <span>Wedding Industry Model Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Recommended Configuration:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Client Emails & Proposals:</span>
                  <Badge>GPT-4</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Wedding Photo Analysis:</span>
                  <Badge>GPT-4 Vision</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Internal Communications:</span>
                  <Badge variant="secondary">GPT-3.5 Turbo</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Bulk Data Processing:</span>
                  <Badge variant="secondary">GPT-3.5 Instruct</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Client Chatbot:</span>
                  <Badge variant="secondary">GPT-3.5 Turbo</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Peak Season Strategy:
              </h4>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p>
                    Use GPT-4 only for client-facing content during peak months
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p>
                    Switch to GPT-3.5 for internal workflows to control costs
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p>
                    Batch process photos during off-peak hours with cheaper
                    models
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p>Cache common wedding responses to reduce API calls</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border-l-4 border-l-orange-500">
                <p className="text-sm text-orange-800">
                  <strong>Pro Tip:</strong> This configuration can save up to
                  65% on AI costs while maintaining premium quality for
                  client-facing interactions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelSelectionOptimizer;
