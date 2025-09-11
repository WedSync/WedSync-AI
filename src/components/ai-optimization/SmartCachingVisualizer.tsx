'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  TrendingUp,
  Camera,
  FileText,
  MessageCircle,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Target,
  PiggyBank,
} from 'lucide-react';
import type {
  SmartCachingVisualizerProps,
  CacheMetrics,
} from '@/types/ai-optimization';

const SmartCachingVisualizer: React.FC<SmartCachingVisualizerProps> = ({
  metrics,
  onOptimizeCache,
  className,
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Format currency
  const formatPence = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Get cache performance status
  const getCacheStatus = (
    hitRate: number,
  ): { color: string; status: string; icon: React.ReactNode } => {
    if (hitRate >= 90)
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        status: 'Excellent',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      };
    if (hitRate >= 75)
      return {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        status: 'Good',
        icon: <Target className="h-4 w-4 text-blue-600" />,
      };
    if (hitRate >= 60)
      return {
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        status: 'Fair',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      };
    return {
      color: 'text-red-600 bg-red-50 border-red-200',
      status: 'Needs Improvement',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    };
  };

  // Handle cache optimization
  const handleOptimizeCache = async () => {
    setIsOptimizing(true);
    try {
      await onOptimizeCache();
      // Simulate optimization process
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Cache optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Calculate potential monthly savings
  const monthlySavingsProjection = metrics.potentialSavingsPence * 30; // Assume current is daily
  const annualSavingsProjection = monthlySavingsProjection * 12;

  // Cache performance by service type
  const services = [
    {
      name: 'Photography AI',
      icon: <Camera className="h-5 w-5 text-blue-500" />,
      hitRate: metrics.photographyCache.hitRate,
      savingsPence: metrics.photographyCache.savingsPence,
      description: 'Image processing, tagging, and enhancement',
      optimization: 'Template-based processing for common photo types',
    },
    {
      name: 'Content Generation',
      icon: <FileText className="h-5 w-5 text-green-500" />,
      hitRate: metrics.contentCache.hitRate,
      savingsPence: metrics.contentCache.savingsPence,
      description: 'Email templates, proposals, and descriptions',
      optimization: 'Cache wedding-specific content templates',
    },
    {
      name: 'Chatbot Interactions',
      icon: <MessageCircle className="h-5 w-5 text-purple-500" />,
      hitRate: metrics.chatbotCache.hitRate,
      savingsPence: metrics.chatbotCache.savingsPence,
      description: 'Client inquiries and automated responses',
      optimization: 'Pre-cache common wedding FAQ responses',
    },
  ];

  const overallStatus = getCacheStatus(metrics.hitRate);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Smart Caching Visualizer
          </h2>
          <p className="text-gray-600">
            Monitor and optimize AI cache performance for cost savings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`${overallStatus.color} border`}>
            {overallStatus.icon}
            <span className="ml-1">{overallStatus.status}</span>
          </Badge>
          <Button
            onClick={handleOptimizeCache}
            disabled={isOptimizing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Optimize Cache
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overall Cache Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Overall Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.hitRate.toFixed(1)}%
            </div>
            <Progress value={metrics.hitRate} className="mt-3" />
            <p className="text-sm text-gray-600 mt-2">
              {metrics.cacheHits.toLocaleString()} hits /{' '}
              {metrics.totalRequests.toLocaleString()} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Daily Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatPence(metrics.estimatedSavingsPence)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Saved through caching
            </div>
            <div className="text-xs text-green-600 mt-1">
              ↓ vs without cache
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Potential Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatPence(metrics.potentialSavingsPence)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Additional daily savings
            </div>
            <div className="text-xs text-orange-600 mt-1">
              With optimization
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatPence(monthlySavingsProjection)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Potential monthly savings
            </div>
            <div className="text-xs text-blue-600 mt-1">
              With optimized cache
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Performance Alert */}
      {metrics.hitRate < 75 && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your cache hit rate is below optimal (75%). Optimizing your cache
            could save an additional{' '}
            <strong>{formatPence(metrics.potentialSavingsPence)}/day</strong> or{' '}
            <strong>{formatPence(monthlySavingsProjection)}/month</strong> on AI
            costs.
          </AlertDescription>
        </Alert>
      )}

      {/* Service-Specific Cache Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance by AI Service</CardTitle>
          <p className="text-sm text-gray-600">
            Detailed breakdown of caching effectiveness across different AI
            services
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {services.map((service, index) => {
              const serviceStatus = getCacheStatus(service.hitRate);

              return (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {service.icon}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {service.hitRate.toFixed(1)}%
                      </div>
                      <Badge
                        className={`${serviceStatus.color} border text-xs`}
                      >
                        {serviceStatus.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Progress value={service.hitRate} className="h-2" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Daily Savings:</span>
                      <div className="font-medium text-green-600">
                        {formatPence(service.savingsPence)}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-600">Monthly Projection:</span>
                      <div className="font-medium text-green-600">
                        {formatPence(service.savingsPence * 30)}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-600">Optimization:</span>
                      <div className="font-medium text-blue-600 text-xs">
                        {service.optimization}
                      </div>
                    </div>
                  </div>

                  {/* Service-specific recommendations */}
                  {service.hitRate < 80 && (
                    <div className="mt-3 p-3 bg-white rounded border-l-4 border-l-orange-400">
                      <p className="text-sm text-orange-800">
                        <strong>Improvement Opportunity:</strong> This service
                        could benefit from cache optimization.
                        {service.name === 'Photography AI' &&
                          ' Consider pre-caching common photo processing templates.'}
                        {service.name === 'Content Generation' &&
                          ' Pre-generate common wedding content templates.'}
                        {service.name === 'Chatbot Interactions' &&
                          ' Cache frequently asked wedding questions and responses.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Caching Strategy Recommendations */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PiggyBank className="h-5 w-5 text-blue-600" />
            <span>Cache Optimization Strategies</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Wedding-Specific Caching:
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <Camera className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Photography Templates:</span>
                    <p className="text-gray-600">
                      Pre-cache common photo processing workflows for bridal
                      portraits, ceremony shots, and reception photos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Content Templates:</span>
                    <p className="text-gray-600">
                      Cache wedding invitation wording, thank you messages, and
                      vendor communication templates.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <MessageCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <span className="font-medium">FAQ Responses:</span>
                    <p className="text-gray-600">
                      Pre-generate responses to common questions about pricing,
                      availability, and services.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Performance Benefits:
              </h4>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Response Time</span>
                    <span className="text-green-600 font-bold">85% faster</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Cached responses return in ~50ms vs 2-5 seconds for API
                    calls
                  </p>
                </div>

                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cost Reduction</span>
                    <span className="text-green-600 font-bold">Up to 90%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Eliminate redundant API calls for similar requests
                  </p>
                </div>

                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Client Experience
                    </span>
                    <span className="text-blue-600 font-bold">Improved</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Instant responses improve customer satisfaction
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Annual Savings Projection */}
          <div className="mt-6 p-4 bg-white rounded-lg border-2 border-blue-300">
            <div className="text-center">
              <h4 className="font-bold text-lg text-gray-900 mb-2">
                Annual Savings Potential
              </h4>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatPence(annualSavingsProjection)}
              </div>
              <p className="text-sm text-gray-600">
                Projected annual savings with optimized caching across all AI
                services
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="font-medium text-gray-800">Daily</div>
                  <div className="text-green-600">
                    {formatPence(metrics.potentialSavingsPence)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-800">Monthly</div>
                  <div className="text-green-600">
                    {formatPence(monthlySavingsProjection)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    Wedding Season
                  </div>
                  <div className="text-green-600">
                    {formatPence(monthlySavingsProjection * 8)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartCachingVisualizer;
