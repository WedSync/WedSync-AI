import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  UserGroupIcon,
  StarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyPoundIcon,
  ClockIcon,
  HeartIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

// Import analytics engines
import { VendorPerformanceAnalyticsForCouples } from '@/lib/wedme/analytics/vendor-performance-couples';
import { CoupleInsightsEngine } from '@/lib/wedme/analytics/couple-insights-engine';

export default function VendorInsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Vendor Insights
              </h1>
              <p className="text-gray-600">
                AI-powered vendor analysis and compatibility matching
              </p>
            </div>
            <Link
              href="/wedme/analytics/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Loading State */}
        <Suspense fallback={<VendorInsightsSkeleton />}>
          <VendorInsightsContent />
        </Suspense>
      </div>
    </div>
  );
}

function VendorInsightsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function VendorInsightsContent() {
  const supabase = createClient();

  // Get current user and wedding context
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Get couple's wedding data
  const { data: wedding } = await supabase
    .from('weddings')
    .select('*')
    .eq('couple_id', user.id)
    .single();

  if (!wedding) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Wedding Found
        </h2>
        <p className="text-gray-600 mb-6">
          Create your wedding profile to access vendor insights
        </p>
        <Link
          href="/wedme/onboarding"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    );
  }

  // Initialize analytics engines
  const vendorAnalytics = new VendorPerformanceAnalyticsForCouples();
  const coupleInsights = new CoupleInsightsEngine();

  // Get vendor analytics data
  const [
    vendorAnalysis,
    compatibilityAnalysis,
    performanceMetrics,
    satisfactionPredictions,
    riskAssessment,
    recommendations,
  ] = await Promise.all([
    vendorAnalytics.getVendorAnalysisReport(user.id, wedding.id),
    vendorAnalytics.analyzeVendorCompatibility(user.id, wedding.id),
    vendorAnalytics.getVendorPerformanceMetrics(user.id, wedding.id),
    vendorAnalytics.predictSatisfactionLevels(user.id, wedding.id),
    vendorAnalytics.assessVendorRisks(user.id, wedding.id),
    vendorAnalytics.getVendorRecommendations(user.id, wedding.id),
  ]);

  const totalVendors = vendorAnalysis.totalVendors || 0;
  const averageRating = vendorAnalysis.averageRating || 0;
  const budgetCompliance = vendorAnalysis.budgetCompliance || 0;
  const riskLevel = riskAssessment.overallRisk || 'low';

  return (
    <div className="space-y-8">
      {/* Vendor Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <VendorOverviewCard
          title="Total Vendors"
          value={totalVendors.toString()}
          icon={UserGroupIcon}
          color="blue"
          subtitle="Connected vendors"
        />
        <VendorOverviewCard
          title="Average Rating"
          value={`${averageRating.toFixed(1)}`}
          icon={StarIcon}
          color="yellow"
          subtitle="Vendor satisfaction"
        />
        <VendorOverviewCard
          title="Budget Compliance"
          value={`${budgetCompliance}%`}
          icon={CurrencyPoundIcon}
          color="green"
          subtitle="Within budget range"
        />
        <VendorOverviewCard
          title="Risk Level"
          value={riskLevel.toUpperCase()}
          icon={ShieldCheckIcon}
          color={
            riskLevel === 'low'
              ? 'green'
              : riskLevel === 'medium'
                ? 'yellow'
                : 'red'
          }
          subtitle="Overall vendor risk"
        />
      </div>

      {/* Vendor Performance Overview */}
      <VendorPerformanceOverview
        performanceMetrics={performanceMetrics}
        compatibilityScore={compatibilityAnalysis.overallCompatibility}
        riskFactors={riskAssessment.riskFactors}
      />

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compatibility Analysis */}
        <VendorCompatibilityAnalysis
          compatibilityData={compatibilityAnalysis}
          weddingStyle={wedding.style || 'Classic'}
          budget={wedding.budget || 25000}
        />

        {/* Performance Metrics */}
        <VendorPerformanceMetrics
          metrics={performanceMetrics}
          satisfactionPredictions={satisfactionPredictions}
        />

        {/* Risk Assessment */}
        <VendorRiskAssessment
          riskData={riskAssessment}
          recommendations={recommendations.riskMitigation}
        />

        {/* Satisfaction Predictions */}
        <VendorSatisfactionPredictions
          predictions={satisfactionPredictions}
          factors={satisfactionPredictions.keyFactors}
        />
      </div>

      {/* Detailed Vendor Analysis */}
      <DetailedVendorAnalysis
        vendors={vendorAnalysis.vendorDetails}
        recommendations={recommendations}
      />

      {/* Smart Recommendations */}
      <SmartVendorRecommendations
        recommendations={recommendations.suggestions}
        compatibilityInsights={compatibilityAnalysis.insights}
      />
    </div>
  );
}

interface VendorOverviewCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: 'blue' | 'red' | 'green' | 'purple' | 'yellow';
  subtitle: string;
}

function VendorOverviewCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: VendorOverviewCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

interface VendorPerformanceOverviewProps {
  performanceMetrics: any;
  compatibilityScore: number;
  riskFactors: Array<{
    vendor: string;
    category: string;
    risk: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

function VendorPerformanceOverview({
  performanceMetrics,
  compatibilityScore,
  riskFactors,
}: VendorPerformanceOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const scoreColor = getScoreColor(compatibilityScore * 100);
  const scoreColorClasses = {
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
  };

  const highRiskFactors = riskFactors.filter(
    (factor) => factor.severity === 'high',
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Vendor Performance Overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Compatibility Score */}
        <div className="text-center">
          <div
            className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center ${scoreColorClasses[scoreColor]}`}
          >
            <span className="text-2xl font-bold">
              {Math.round(compatibilityScore * 100)}
            </span>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            Compatibility Score
          </h4>
          <p className="text-xs text-gray-500">AI-powered matching analysis</p>
        </div>

        {/* Performance Highlights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Performance Highlights
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Response Time</span>
              <span className="font-medium text-green-600">
                {performanceMetrics.averageResponseTime || '24h'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Budget Accuracy</span>
              <span className="font-medium text-blue-600">
                {performanceMetrics.budgetAccuracy || '95%'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium text-green-600">
                {performanceMetrics.completionRate || '98%'}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Risk Alerts</h4>
          {highRiskFactors.length > 0 ? (
            <div className="space-y-2">
              {highRiskFactors.slice(0, 2).map((risk, index) => (
                <div
                  key={index}
                  className="flex items-start p-2 bg-red-50 rounded border border-red-200"
                >
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-900">
                      {risk.vendor}
                    </p>
                    <p className="text-xs text-red-700">{risk.risk}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center p-2 bg-green-50 rounded border border-green-200">
              <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-xs text-green-700">
                All vendors low risk
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VendorCompatibilityAnalysisProps {
  compatibilityData: any;
  weddingStyle: string;
  budget: number;
}

function VendorCompatibilityAnalysis({
  compatibilityData,
  weddingStyle,
  budget,
}: VendorCompatibilityAnalysisProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Compatibility Analysis
      </h3>

      <div className="space-y-6">
        {/* Wedding Style Matching */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Style Compatibility
          </h4>
          <div className="space-y-2">
            {compatibilityData.styleMatching?.map(
              (match: any, index: number) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{match.vendor}</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(match.score * 100)}% match
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        match.score > 0.8
                          ? 'bg-green-500'
                          : match.score > 0.6
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${match.score * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{match.reason}</p>
                </div>
              ),
            ) || []}
          </div>
        </div>

        {/* Budget Alignment */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Budget Alignment
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Your Budget</p>
              <p className="text-lg font-semibold text-blue-900">
                £{budget.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 mb-1">Vendor Average</p>
              <p className="text-lg font-semibold text-green-900">
                £
                {compatibilityData.averageVendorCost?.toLocaleString() ||
                  budget * 0.95}
              </p>
            </div>
          </div>
        </div>

        {/* Location Compatibility */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Location & Logistics
          </h4>
          <div className="space-y-2">
            {compatibilityData.locationFactors?.map(
              (factor: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-700">{factor.aspect}</span>
                  <span
                    className={`text-sm font-medium ${
                      factor.status === 'optimal'
                        ? 'text-green-600'
                        : factor.status === 'good'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {factor.status}
                  </span>
                </div>
              ),
            ) || []}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VendorPerformanceMetricsProps {
  metrics: any;
  satisfactionPredictions: any;
}

function VendorPerformanceMetrics({
  metrics,
  satisfactionPredictions,
}: VendorPerformanceMetricsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Performance Metrics
      </h3>

      <div className="space-y-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <HeartIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-purple-900">
              {satisfactionPredictions.overallSatisfaction?.toFixed(1) || '4.2'}
            </div>
            <div className="text-xs text-purple-600">
              Predicted Satisfaction
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <ClockIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-blue-900">
              {metrics.onTimeDelivery || '96%'}
            </div>
            <div className="text-xs text-blue-600">On-Time Delivery</div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Category Performance
          </h4>
          <div className="space-y-3">
            {Object.entries(metrics.categoryScores || {}).map(
              ([category, score]: [string, any]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{category}</span>
                    <div className="flex items-center space-x-2">
                      <StarIcon className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-900">
                        {score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(score / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Communication Quality */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Communication Quality
          </h4>
          <div className="space-y-2">
            <div className="flex items-center p-2 bg-green-50 rounded">
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Response Rate
                </p>
                <p className="text-xs text-green-700">
                  {metrics.responseRate || '98%'} within 24h
                </p>
              </div>
            </div>
            <div className="flex items-center p-2 bg-blue-50 rounded">
              <PhotoIcon className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Portfolio Quality
                </p>
                <p className="text-xs text-blue-700">
                  {metrics.portfolioScore || '4.6'}/5.0 average
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VendorRiskAssessmentProps {
  riskData: any;
  recommendations: Array<{
    vendor: string;
    risk: string;
    mitigation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

function VendorRiskAssessment({
  riskData,
  recommendations,
}: VendorRiskAssessmentProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Risk Assessment
      </h3>

      <div className="space-y-6">
        {/* Overall Risk Level */}
        <div
          className={`p-4 rounded-lg border ${getRiskColor(riskData.overallRisk)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Overall Risk Level</h4>
            <span className="text-lg font-semibold uppercase">
              {riskData.overallRisk}
            </span>
          </div>
          <p className="text-xs">{riskData.riskSummary}</p>
        </div>

        {/* Individual Risk Factors */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Risk Factors</h4>
          <div className="space-y-3">
            {riskData.riskFactors
              ?.slice(0, 4)
              .map((risk: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">
                      {risk.vendor}
                    </h5>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getRiskColor(risk.severity)}`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{risk.risk}</p>
                  <div className="text-xs text-gray-500">
                    <strong>Impact:</strong> {risk.impact}
                  </div>
                </div>
              )) || []}
          </div>
        </div>

        {/* Mitigation Recommendations */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Recommended Actions
          </h4>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div
                key={index}
                className="flex items-start p-2 bg-blue-50 rounded border border-blue-200"
              >
                <CheckCircleIcon className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-900">
                    {rec.vendor}
                  </p>
                  <p className="text-xs text-blue-700">{rec.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VendorSatisfactionPredictionsProps {
  predictions: any;
  factors: Array<{
    factor: string;
    impact: number;
    positive: boolean;
  }>;
}

function VendorSatisfactionPredictions({
  predictions,
  factors,
}: VendorSatisfactionPredictionsProps) {
  const overallSatisfaction = predictions.overallSatisfaction || 4.2;
  const confidenceLevel = predictions.confidenceLevel || 85;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Satisfaction Predictions
      </h3>

      <div className="space-y-6">
        {/* Overall Prediction */}
        <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-900 mb-1">
            {overallSatisfaction.toFixed(1)}/5.0
          </div>
          <div className="text-sm text-purple-700 mb-2">
            Predicted Overall Satisfaction
          </div>
          <div className="text-xs text-purple-600">
            {confidenceLevel}% prediction confidence
          </div>
        </div>

        {/* Category Predictions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Category Predictions
          </h4>
          <div className="space-y-3">
            {Object.entries(predictions.categoryPredictions || {}).map(
              ([category, score]: [string, any]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{category}</span>
                    <span className="font-medium text-gray-900">
                      {score.toFixed(1)}/5.0
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score > 4
                          ? 'bg-green-500'
                          : score > 3
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${(score / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Key Factors */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Key Factors
          </h4>
          <div className="space-y-2">
            {factors.slice(0, 4).map((factor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700">{factor.factor}</span>
                <div className="flex items-center">
                  {factor.positive ? (
                    <TrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      factor.positive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {factor.positive ? '+' : ''}
                    {(factor.impact * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailedVendorAnalysisProps {
  vendors: Array<{
    id: string;
    name: string;
    category: string;
    overallScore: number;
    budget: number;
    style: number;
    reliability: number;
    experience: number;
    reviews: number;
    riskLevel: 'low' | 'medium' | 'high';
    matchPercentage: number;
  }>;
  recommendations: any;
}

function DetailedVendorAnalysis({
  vendors,
  recommendations,
}: DetailedVendorAnalysisProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Detailed Vendor Analysis
      </h3>

      <div className="space-y-6">
        {vendors.slice(0, 3).map((vendor, index) => (
          <div
            key={vendor.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {vendor.name}
                </h4>
                <p className="text-sm text-gray-600">{vendor.category}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-purple-600">
                  {vendor.overallScore}/100
                </div>
                <div className="text-sm text-gray-500">
                  {vendor.matchPercentage}% match
                </div>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {vendor.budget}/100
                </div>
                <div className="text-xs text-gray-500">Budget</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {vendor.style}/100
                </div>
                <div className="text-xs text-gray-500">Style</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {vendor.reliability}/100
                </div>
                <div className="text-xs text-gray-500">Reliability</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {vendor.experience}/100
                </div>
                <div className="text-xs text-gray-500">Experience</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {vendor.reviews}/100
                </div>
                <div className="text-xs text-gray-500">Reviews</div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="flex items-center justify-between">
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  vendor.riskLevel === 'low'
                    ? 'bg-green-100 text-green-800'
                    : vendor.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {vendor.riskLevel.toUpperCase()} RISK
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SmartVendorRecommendationsProps {
  recommendations: Array<{
    type: 'improvement' | 'alternative' | 'optimization';
    vendor: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }>;
  compatibilityInsights: Array<{
    insight: string;
    actionable: boolean;
    priority: 'high' | 'medium' | 'low';
  }>;
}

function SmartVendorRecommendations({
  recommendations,
  compatibilityInsights,
}: SmartVendorRecommendationsProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Smart Recommendations
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Recommendations */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            Recommended Actions
          </h4>
          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900">
                      {rec.vendor}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {rec.suggestion}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <div
                      className={`px-2 py-1 text-xs rounded ${getImpactColor(rec.impact)}`}
                    >
                      {rec.impact} impact
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Apply →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compatibility Insights */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            Compatibility Insights
          </h4>
          <div className="space-y-3">
            {compatibilityInsights.slice(0, 4).map((insight, index) => (
              <div
                key={index}
                className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
              >
                <p className="text-sm text-purple-900 mb-2">
                  {insight.insight}
                </p>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      insight.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : insight.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {insight.priority} priority
                  </span>
                  {insight.actionable && (
                    <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                      Take Action →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
