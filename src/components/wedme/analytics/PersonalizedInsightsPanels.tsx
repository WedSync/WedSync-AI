'use client';

import { useState } from 'react';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  HeartIcon,
  ClockIcon,
  CurrencyPoundIcon,
  SparklesIcon,
  LightBulbIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface PersonalizedInsight {
  id: string;
  type:
    | 'progress'
    | 'recommendation'
    | 'warning'
    | 'celebration'
    | 'prediction';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionRequired: boolean;
  actionUrl?: string;
  metrics?: {
    current: number;
    target: number;
    unit: string;
  };
  timeline?: string;
}

interface RiskFactor {
  category: string;
  risk: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
  impact: string;
}

interface Opportunity {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
  timeToImplement?: string;
  actionUrl?: string;
}

interface PersonalizedInsights {
  coupleId: string;
  weddingId: string;
  insights: PersonalizedInsight[];
  overallScore: number;
  nextSteps: string[];
  riskFactors: RiskFactor[];
  opportunities: Opportunity[];
  lastUpdated: Date;
  planningPhase: 'early' | 'middle' | 'final' | 'post';
}

interface PersonalizedInsightsPanelsProps {
  insights: PersonalizedInsights;
}

export function PersonalizedInsightsPanels({
  insights,
}: PersonalizedInsightsPanelsProps) {
  const [activeTab, setActiveTab] = useState<
    'insights' | 'risks' | 'opportunities'
  >('insights');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'all',
    'budget',
    'timeline',
    'vendors',
    'planning',
    'social',
  ];

  const filteredInsights =
    selectedCategory === 'all'
      ? insights.insights
      : insights.insights.filter(
          (insight) => insight.category === selectedCategory,
        );

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return TrendingUpIcon;
      case 'recommendation':
        return LightBulbIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'celebration':
        return CheckCircleIcon;
      case 'prediction':
        return SparklesIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'progress':
        return 'blue';
      case 'recommendation':
        return 'purple';
      case 'warning':
        return 'red';
      case 'celebration':
        return 'green';
      case 'prediction':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[impact as keyof typeof colors] || colors.low;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Personalized Insights
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered recommendations tailored to your wedding
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {insights.overallScore}%
          </div>
          <div className="text-xs text-gray-500">Planning Health</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          {
            key: 'insights',
            label: 'Insights',
            count: insights.insights.length,
          },
          { key: 'risks', label: 'Risks', count: insights.riskFactors.length },
          {
            key: 'opportunities',
            label: 'Opportunities',
            count: insights.opportunities.length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-xs rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Insights List */}
            <div className="space-y-3">
              {filteredInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  icon={getInsightIcon(insight.type)}
                  color={getInsightColor(insight.type)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-4">
            <RiskFactorsPanel riskFactors={insights.riskFactors} />
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            <OpportunitiesPanel opportunities={insights.opportunities} />
          </div>
        )}
      </div>

      {/* Planning Phase Indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <PlanningPhaseIndicator
          phase={insights.planningPhase}
          overallScore={insights.overallScore}
          nextSteps={insights.nextSteps}
        />
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: PersonalizedInsight;
  icon: React.ComponentType<any>;
  color: string;
}

function InsightCard({ insight, icon: Icon, color }: InsightCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[impact as keyof typeof colors] || colors.low;
  };

  return (
    <div
      className={`border rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              {insight.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1">{insight.category}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${getImpactBadge(insight.impact)}`}
          >
            {insight.impact}
          </span>
          <div className="text-xs text-gray-500">
            {insight.confidence}% confidence
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{insight.description}</p>

      {/* Metrics */}
      {insight.metrics && (
        <div className="mb-3 p-3 bg-white bg-opacity-50 rounded border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Progress</span>
            <span className="text-xs font-medium text-gray-900">
              {insight.metrics.current} / {insight.metrics.target}{' '}
              {insight.metrics.unit}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-current h-2 rounded-full opacity-70"
              style={{
                width: `${Math.min((insight.metrics.current / insight.metrics.target) * 100, 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {insight.timeline && (
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="w-3 h-3 mr-1" />
            {insight.timeline}
          </div>
        )}
        {insight.actionRequired && insight.actionUrl && (
          <button className="text-xs font-medium hover:underline">
            Take Action →
          </button>
        )}
      </div>
    </div>
  );
}

interface RiskFactorsPanelProps {
  riskFactors: RiskFactor[];
}

function RiskFactorsPanel({ riskFactors }: RiskFactorsPanelProps) {
  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const highRisks = riskFactors.filter((risk) => risk.severity === 'high');
  const mediumRisks = riskFactors.filter((risk) => risk.severity === 'medium');
  const lowRisks = riskFactors.filter((risk) => risk.severity === 'low');

  return (
    <div className="space-y-4">
      {/* High Priority Risks */}
      {highRisks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
            High Priority Risks ({highRisks.length})
          </h4>
          <div className="space-y-3">
            {highRisks.map((risk, index) => (
              <RiskFactorCard key={index} risk={risk} />
            ))}
          </div>
        </div>
      )}

      {/* Medium Priority Risks */}
      {mediumRisks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-900 mb-3">
            Medium Priority Risks ({mediumRisks.length})
          </h4>
          <div className="space-y-3">
            {mediumRisks.slice(0, 3).map((risk, index) => (
              <RiskFactorCard key={index} risk={risk} />
            ))}
          </div>
        </div>
      )}

      {/* Low Priority Risks */}
      {lowRisks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-900 mb-3">
            Low Priority Risks ({lowRisks.length})
          </h4>
          <div className="space-y-3">
            {lowRisks.slice(0, 2).map((risk, index) => (
              <RiskFactorCard key={index} risk={risk} />
            ))}
          </div>
        </div>
      )}

      {riskFactors.length === 0 && (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            No Risks Identified
          </h4>
          <p className="text-xs text-gray-600">
            Your wedding planning is on track!
          </p>
        </div>
      )}
    </div>
  );
}

interface RiskFactorCardProps {
  risk: RiskFactor;
}

function RiskFactorCard({ risk }: RiskFactorCardProps) {
  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getRiskColor(risk.severity)}`}>
      <div className="flex items-start justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-900">{risk.category}</h5>
        <span className="text-xs font-medium uppercase px-2 py-1 bg-white bg-opacity-50 rounded">
          {risk.severity}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{risk.risk}</p>

      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-gray-600">Impact: </span>
          <span className="text-xs text-gray-800">{risk.impact}</span>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-600">
            Mitigation:{' '}
          </span>
          <span className="text-xs text-gray-800">{risk.mitigation}</span>
        </div>
      </div>

      <button className="mt-3 text-xs font-medium hover:underline">
        Address Risk →
      </button>
    </div>
  );
}

interface OpportunitiesPanelProps {
  opportunities: Opportunity[];
}

function OpportunitiesPanel({ opportunities }: OpportunitiesPanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'medium':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'low':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const highPriority = opportunities.filter((opp) => opp.priority === 'high');
  const mediumPriority = opportunities.filter(
    (opp) => opp.priority === 'medium',
  );
  const lowPriority = opportunities.filter((opp) => opp.priority === 'low');

  return (
    <div className="space-y-4">
      {/* High Priority Opportunities */}
      {highPriority.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center">
            <SparklesIcon className="w-4 h-4 mr-2" />
            High Priority Opportunities ({highPriority.length})
          </h4>
          <div className="space-y-3">
            {highPriority.map((opportunity, index) => (
              <OpportunityCard key={index} opportunity={opportunity} />
            ))}
          </div>
        </div>
      )}

      {/* Medium Priority Opportunities */}
      {mediumPriority.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-3">
            Medium Priority Opportunities ({mediumPriority.length})
          </h4>
          <div className="space-y-3">
            {mediumPriority.slice(0, 3).map((opportunity, index) => (
              <OpportunityCard key={index} opportunity={opportunity} />
            ))}
          </div>
        </div>
      )}

      {/* Low Priority Opportunities */}
      {lowPriority.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Additional Opportunities ({lowPriority.length})
          </h4>
          <div className="space-y-3">
            {lowPriority.slice(0, 2).map((opportunity, index) => (
              <OpportunityCard key={index} opportunity={opportunity} />
            ))}
          </div>
        </div>
      )}

      {opportunities.length === 0 && (
        <div className="text-center py-8">
          <LightBulbIcon className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            No New Opportunities
          </h4>
          <p className="text-xs text-gray-600">
            Check back later for new optimization suggestions!
          </p>
        </div>
      )}
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: Opportunity;
}

function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'medium':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'low':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${getPriorityColor(opportunity.priority)}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-900">
          {opportunity.title}
        </h5>
        <span className="text-xs font-medium uppercase px-2 py-1 bg-white bg-opacity-50 rounded">
          {opportunity.priority}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{opportunity.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          {opportunity.estimatedSavings && (
            <div className="flex items-center">
              <CurrencyPoundIcon className="w-3 h-3 mr-1" />
              Save £{opportunity.estimatedSavings.toLocaleString()}
            </div>
          )}
          {opportunity.timeToImplement && (
            <div className="flex items-center">
              <ClockIcon className="w-3 h-3 mr-1" />
              {opportunity.timeToImplement}
            </div>
          )}
        </div>

        {opportunity.actionUrl && (
          <button className="text-xs font-medium hover:underline">
            Explore →
          </button>
        )}
      </div>
    </div>
  );
}

interface PlanningPhaseIndicatorProps {
  phase: 'early' | 'middle' | 'final' | 'post';
  overallScore: number;
  nextSteps: string[];
}

function PlanningPhaseIndicator({
  phase,
  overallScore,
  nextSteps,
}: PlanningPhaseIndicatorProps) {
  const phaseInfo = {
    early: {
      title: 'Early Planning',
      description: 'Building your wedding foundation',
      icon: CalendarDaysIcon,
      color: 'blue',
      progress: 25,
    },
    middle: {
      title: 'Mid Planning',
      description: 'Locking in vendors and details',
      icon: UserGroupIcon,
      color: 'purple',
      progress: 60,
    },
    final: {
      title: 'Final Details',
      description: 'Finalizing last-minute items',
      icon: CheckCircleIcon,
      color: 'orange',
      progress: 90,
    },
    post: {
      title: 'Post Wedding',
      description: 'Following up and memories',
      icon: HeartIcon,
      color: 'green',
      progress: 100,
    },
  };

  const currentPhase = phaseInfo[phase];
  const Icon = currentPhase.icon;

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    green: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div
      className={`border rounded-lg p-4 ${colorClasses[currentPhase.color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="w-5 h-5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {currentPhase.title}
            </h4>
            <p className="text-xs text-gray-600">{currentPhase.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{overallScore}%</div>
          <div className="text-xs text-gray-600">Complete</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Planning Progress</span>
          <span>{currentPhase.progress}%</span>
        </div>
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
          <div
            className="bg-current h-2 rounded-full opacity-70"
            style={{ width: `${currentPhase.progress}%` }}
          ></div>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-medium text-gray-700 mb-2">
          Next Priority Steps:
        </h5>
        <div className="space-y-1">
          {nextSteps.slice(0, 3).map((step, index) => (
            <div
              key={index}
              className="flex items-center text-xs text-gray-700"
            >
              <div className="w-4 h-4 rounded-full bg-white bg-opacity-50 flex items-center justify-center mr-2">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
