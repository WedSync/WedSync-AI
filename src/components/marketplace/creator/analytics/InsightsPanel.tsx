'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp,
  AlertCircle,
  Info,
  ChevronRight,
  X,
  Lightbulb,
  DollarSign,
  Package,
  Calendar,
} from 'lucide-react';

interface Insight {
  id: string;
  type:
    | 'pricing'
    | 'timing'
    | 'competition'
    | 'seasonality'
    | 'bundling'
    | 'performance'
    | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  suggestedActions: Array<{
    action: string;
    description: string;
    estimatedUplift: string;
  }>;
  weddingContext: string;
  expires_at: string;
}

interface InsightsPanelProps {
  insights?: {
    insights: Insight[];
    recommendations: {
      pricingOptimization: Array<{
        templateId: string;
        currentPrice: number;
        suggestedPrice: number;
        expectedUplift: number;
        confidence: number;
      }>;
      bundleOpportunities: Array<{
        templates: string[];
        bundleName: string;
        individualPrice: number;
        suggestedBundlePrice: number;
        projectedSales: number;
      }>;
      seasonalStrategies: Array<{
        season: string;
        strategy: string;
        expectedImpact: string;
      }>;
    };
  };
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const handleDismissInsight = async (insightId: string) => {
    try {
      const response = await fetch(
        '/api/marketplace/creator/analytics/insights',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insightId, action: 'dismiss' }),
        },
      );

      if (response.ok) {
        setDismissedInsights([...dismissedInsights, insightId]);
      }
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pricing':
        return <DollarSign className="h-4 w-4" />;
      case 'bundling':
        return <Package className="h-4 w-4" />;
      case 'seasonality':
        return <Calendar className="h-4 w-4" />;
      case 'opportunity':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-5 w-5" />
            <p>Loading insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeInsights = insights.insights.filter(
    (i) => !dismissedInsights.includes(i.id),
  );

  return (
    <div className="space-y-6">
      {/* Active Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance Insights</h2>
          <Badge variant="outline">{activeInsights.length} Active</Badge>
        </div>

        {activeInsights.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No new insights available</p>
                <p className="text-sm mt-1">
                  Check back later for optimization opportunities
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeInsights.map((insight) => (
              <Alert key={insight.id} className="relative">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTitle className="text-base">
                          {insight.title}
                        </AlertTitle>
                        <Badge
                          variant={getSeverityColor(insight.severity) as any}
                          className="text-xs"
                        >
                          {insight.severity}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissInsight(insight.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <AlertDescription className="text-sm">
                      <p className="mb-2">{insight.description}</p>

                      {insight.impact && (
                        <p className="text-green-600 font-medium mb-2">
                          Impact: {insight.impact}
                        </p>
                      )}

                      {insight.weddingContext && (
                        <p className="text-blue-600 italic mb-3">
                          💡 {insight.weddingContext}
                        </p>
                      )}

                      {insight.actionable &&
                        insight.suggestedActions.length > 0 && (
                          <div
                            className={
                              expandedInsight === insight.id ? '' : 'hidden'
                            }
                          >
                            <p className="font-medium mb-2">
                              Suggested Actions:
                            </p>
                            <ul className="space-y-2">
                              {insight.suggestedActions.map((action, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400" />
                                  <div>
                                    <span className="font-medium">
                                      {action.action}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {' '}
                                      - {action.description}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-xs"
                                    >
                                      {action.estimatedUplift}
                                    </Badge>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {insight.actionable &&
                        insight.suggestedActions.length > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              setExpandedInsight(
                                expandedInsight === insight.id
                                  ? null
                                  : insight.id,
                              )
                            }
                            className="p-0 h-auto mt-2"
                          >
                            {expandedInsight === insight.id ? 'Hide' : 'Show'}{' '}
                            Actions
                          </Button>
                        )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Optimization */}
      {insights.recommendations.pricingOptimization.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Recommendations</CardTitle>
            <CardDescription>
              AI-powered pricing optimization suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.pricingOptimization.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Template #{rec.templateId.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current: ${(rec.currentPrice / 100).toFixed(2)} →
                      Suggested: ${(rec.suggestedPrice / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={rec.expectedUplift > 0 ? 'default' : 'secondary'}
                    >
                      {rec.expectedUplift > 0 ? '+' : ''}
                      {rec.expectedUplift}% sales
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(rec.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bundle Opportunities */}
      {insights.recommendations.bundleOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bundle Opportunities</CardTitle>
            <CardDescription>
              Templates frequently purchased together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.bundleOpportunities.map(
                (bundle, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{bundle.bundleName}</p>
                      <Badge variant="outline">
                        {bundle.projectedSales}% buy together
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Individual: ${(bundle.individualPrice / 100).toFixed(2)}
                      </span>
                      <span className="text-green-600 font-medium">
                        Bundle: $
                        {(bundle.suggestedBundlePrice / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {bundle.templates.length} templates in bundle
                    </p>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Strategies</CardTitle>
          <CardDescription>Optimize for wedding seasonality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {insights.recommendations.seasonalStrategies.map(
              (strategy, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium capitalize">{strategy.season}</p>
                    <p className="text-sm text-muted-foreground">
                      {strategy.strategy}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {strategy.expectedImpact}
                    </Badge>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
