// WS-055: Action Recommendations Component
// Provides actionable insights and recommendations based on ML predictions

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Lightbulb,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Gift,
  Star,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import type {
  BookingPrediction,
  IntentScore,
  BehaviorPattern,
} from '@/lib/ml/prediction/types';

interface ActionRecommendationsProps {
  predictions: BookingPrediction[];
  intentScores: IntentScore[];
  behaviorPatterns: BehaviorPattern[];
}

interface Recommendation {
  id: string;
  type: 'immediate' | 'scheduled' | 'nurture' | 'intervention';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  expectedImpact: number; // 0-10 scale
  timeInvestment: number; // minutes
  targetClients: string[];
  deadline?: Date;
  estimatedRevenue: number;
  successProbability: number;
  channel: 'phone' | 'email' | 'meeting' | 'campaign';
  category: 'engagement' | 'conversion' | 'retention' | 'upsell';
}

interface ActionSummary {
  totalRecommendations: number;
  criticalActions: number;
  potentialRevenue: number;
  estimatedWorkload: number;
  avgSuccessProbability: number;
}

export function ActionRecommendations({
  predictions,
  intentScores,
  behaviorPatterns,
}: ActionRecommendationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'priority' | 'category' | 'timeline'
  >('priority');

  // Generate intelligent recommendations
  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    // High-intent clients - immediate contact recommendations
    intentScores
      .filter(
        (score) => score.category === 'very_high' || score.category === 'high',
      )
      .forEach((score) => {
        const prediction = predictions.find(
          (p) => p.client_id === score.client_id,
        );
        const bookingProb = prediction?.probability || 0.5;

        if (bookingProb > 0.7) {
          recs.push({
            id: `immediate-${score.client_id}`,
            type: 'immediate',
            priority: 'critical',
            action: 'Schedule immediate consultation',
            description: `Client ${score.client_id.slice(-8)} shows very high intent (${score.score}/100) with ${(bookingProb * 100).toFixed(0)}% booking probability`,
            expectedImpact: 9,
            timeInvestment: 45,
            targetClients: [score.client_id],
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            estimatedRevenue: bookingProb * 15000,
            successProbability: 0.85,
            channel: 'phone',
            category: 'conversion',
          });
        } else {
          recs.push({
            id: `nurture-${score.client_id}`,
            type: 'nurture',
            priority: 'high',
            action: 'Send personalized proposal',
            description: `High intent client needs personalized attention to increase booking probability from ${(bookingProb * 100).toFixed(0)}%`,
            expectedImpact: 7,
            timeInvestment: 30,
            targetClients: [score.client_id],
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            estimatedRevenue: bookingProb * 15000 * 1.3, // Expected improvement
            successProbability: 0.65,
            channel: 'email',
            category: 'conversion',
          });
        }
      });

    // Churn risk interventions
    predictions
      .filter((p) => p.probability < 0.3)
      .forEach((prediction) => {
        const intentScore = intentScores.find(
          (s) => s.client_id === prediction.client_id,
        );

        recs.push({
          id: `intervention-${prediction.client_id}`,
          type: 'intervention',
          priority: 'high',
          action: 'Churn prevention outreach',
          description: `Client at risk with ${(prediction.probability * 100).toFixed(0)}% booking probability. Immediate intervention needed.`,
          expectedImpact: 6,
          timeInvestment: 20,
          targetClients: [prediction.client_id],
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          estimatedRevenue: prediction.probability * 15000 * 2, // Double potential if successful
          successProbability: 0.45,
          channel: 'phone',
          category: 'retention',
        });
      });

    // Pattern-based recommendations
    behaviorPatterns.forEach((pattern) => {
      const actions = pattern.recommended_actions.slice(0, 2); // Top 2 actions

      actions.forEach((action, index) => {
        recs.push({
          id: `pattern-${pattern.pattern_id}-${index}`,
          type: 'scheduled',
          priority: pattern.confidence > 0.8 ? 'high' : 'medium',
          action,
          description: `Based on ${pattern.pattern_type.replace(/_/g, ' ')} pattern with ${(pattern.confidence * 100).toFixed(0)}% confidence`,
          expectedImpact: Math.round(
            pattern.typical_outcomes.success_rate * 10,
          ),
          timeInvestment: 25,
          targetClients: [pattern.pattern_id.split('-').pop() || ''],
          deadline: new Date(
            Date.now() +
              pattern.typical_outcomes.average_timeline_to_booking *
                24 *
                60 *
                60 *
                1000,
          ),
          estimatedRevenue:
            pattern.typical_outcomes.booking_probability * 15000,
          successProbability: pattern.typical_outcomes.success_rate,
          channel: action.includes('call')
            ? 'phone'
            : action.includes('meeting')
              ? 'meeting'
              : 'email',
          category:
            pattern.pattern_type === 'churn_risk' ? 'retention' : 'engagement',
        });
      });
    });

    // Batch recommendations for similar patterns
    const mediumIntentClients = intentScores.filter(
      (s) => s.category === 'medium',
    );
    if (mediumIntentClients.length >= 3) {
      recs.push({
        id: 'batch-nurture-medium',
        type: 'nurture',
        priority: 'medium',
        action: 'Launch nurture email campaign',
        description: `Engage ${mediumIntentClients.length} medium-intent clients with educational content`,
        expectedImpact: 5,
        timeInvestment: 60,
        targetClients: mediumIntentClients.map((s) => s.client_id),
        estimatedRevenue: mediumIntentClients.length * 15000 * 0.4, // 40% conversion
        successProbability: 0.55,
        channel: 'campaign',
        category: 'engagement',
      });
    }

    return recs.sort((a, b) => {
      // Sort by priority first, then by expected impact
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.expectedImpact - a.expectedImpact;
    });
  }, [predictions, intentScores, behaviorPatterns]);

  // Calculate summary metrics
  const summary = useMemo((): ActionSummary => {
    if (!recommendations.length) {
      return {
        totalRecommendations: 0,
        criticalActions: 0,
        potentialRevenue: 0,
        estimatedWorkload: 0,
        avgSuccessProbability: 0,
      };
    }

    const criticalActions = recommendations.filter(
      (r) => r.priority === 'critical',
    ).length;
    const totalRevenue = recommendations.reduce(
      (sum, r) => sum + r.estimatedRevenue,
      0,
    );
    const totalWorkload = recommendations.reduce(
      (sum, r) => sum + r.timeInvestment,
      0,
    );
    const avgSuccess =
      recommendations.reduce((sum, r) => sum + r.successProbability, 0) /
      recommendations.length;

    return {
      totalRecommendations: recommendations.length,
      criticalActions,
      potentialRevenue: totalRevenue,
      estimatedWorkload: totalWorkload,
      avgSuccessProbability: avgSuccess,
    };
  }, [recommendations]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'campaign':
        return <Users className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'conversion':
        return <Target className="h-4 w-4 text-green-500" />;
      case 'engagement':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'retention':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'upsell':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredRecommendations = recommendations.filter((rec) => {
    if (selectedCategory && rec.category !== selectedCategory) return false;
    if (selectedPriority && rec.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Recommendations
                </span>
              </div>
              <p className="text-2xl font-bold">
                {summary.totalRecommendations}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">
                  Critical Actions
                </span>
              </div>
              <p className="text-2xl font-bold">{summary.criticalActions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Potential Revenue
                </span>
              </div>
              <p className="text-2xl font-bold">
                ${(summary.potentialRevenue / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Workload</span>
              </div>
              <p className="text-2xl font-bold">
                {Math.round(summary.estimatedWorkload / 60)}h
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  Success Rate
                </span>
              </div>
              <p className="text-2xl font-bold">
                {(summary.avgSuccessProbability * 100).toFixed(0)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'priority' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('priority')}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Priority
          </Button>
          <Button
            variant={viewMode === 'category' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('category')}
          >
            <Target className="h-4 w-4 mr-1" />
            Category
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            <Clock className="h-4 w-4 mr-1" />
            Timeline
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <select
            className="text-sm border rounded px-2 py-1"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
          >
            <option value="">All Categories</option>
            <option value="conversion">Conversion</option>
            <option value="engagement">Engagement</option>
            <option value="retention">Retention</option>
            <option value="upsell">Upsell</option>
          </select>

          <select
            className="text-sm border rounded px-2 py-1"
            value={selectedPriority || ''}
            onChange={(e) => setSelectedPriority(e.target.value || null)}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No recommendations match your filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecommendations.slice(0, 20).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-1 h-16 rounded-full ${getPriorityColor(rec.priority)}`}
                        ></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getCategoryIcon(rec.category)}
                            <h4 className="font-medium">{rec.action}</h4>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {rec.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              {getChannelIcon(rec.channel)}
                              <span className="capitalize">{rec.channel}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{rec.timeInvestment}min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {rec.targetClients.length} client
                                {rec.targetClients.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {rec.deadline && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Due {rec.deadline.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          ${(rec.estimatedRevenue / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(rec.successProbability * 100).toFixed(0)}% success
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Impact:
                        </span>
                        <Progress
                          value={rec.expectedImpact * 10}
                          className="w-20 h-2"
                        />
                        <span className="text-sm font-medium">
                          {rec.expectedImpact}/10
                        </span>
                      </div>

                      <Button size="sm" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Take Action
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Summary */}
      {summary.criticalActions > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">
                  Immediate Action Required
                </h4>
                <p className="text-sm text-red-700">
                  {summary.criticalActions} critical action
                  {summary.criticalActions !== 1 ? 's' : ''} need immediate
                  attention. Potential revenue impact: $
                  {(summary.potentialRevenue / 1000).toFixed(0)}K
                </p>
                <div className="mt-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    View Critical Actions
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
