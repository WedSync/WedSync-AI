import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyPoundIcon,
  CalendarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

// Import analytics engines
import { BudgetOptimizationSystem } from '@/lib/wedme/analytics/budget-optimization';
import { CoupleInsightsEngine } from '@/lib/wedme/analytics/couple-insights-engine';

export default function BudgetAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Budget Analytics
              </h1>
              <p className="text-gray-600">
                Intelligent budget optimization and cost-saving recommendations
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
        <Suspense fallback={<BudgetAnalyticsSkeleton />}>
          <BudgetAnalyticsContent />
        </Suspense>
      </div>
    </div>
  );
}

function BudgetAnalyticsSkeleton() {
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
        {Array.from({ length: 4 }).map((_, i) => (
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

async function BudgetAnalyticsContent() {
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
          Create your wedding profile to access budget analytics
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
  const budgetOptimization = new BudgetOptimizationSystem();
  const coupleInsights = new CoupleInsightsEngine();

  // Get budget analytics data
  const [
    budgetAnalysis,
    spendingAnalysis,
    seasonalInsights,
    optimizationRecommendations,
    categoryAnalysis,
    forecastData,
  ] = await Promise.all([
    budgetOptimization.analyzeBudgetHealth(user.id, wedding.id),
    budgetOptimization.analyzeSpendingPatterns(user.id, wedding.id),
    budgetOptimization.getSeasonalPricingInsights(user.id, wedding.id),
    budgetOptimization.getOptimizationRecommendations(user.id, wedding.id),
    budgetOptimization.analyzeCategorySpending(user.id, wedding.id),
    budgetOptimization.generateBudgetForecast(user.id, wedding.id),
  ]);

  const totalBudget = budgetAnalysis.totalBudget || 25000; // Default budget
  const spentAmount = budgetAnalysis.spentAmount || 0;
  const remainingBudget = totalBudget - spentAmount;
  const budgetUtilization = (spentAmount / totalBudget) * 100;

  return (
    <div className="space-y-8">
      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BudgetOverviewCard
          title="Total Budget"
          value={`£${totalBudget.toLocaleString()}`}
          icon={CurrencyPoundIcon}
          color="blue"
          subtitle="Set budget amount"
        />
        <BudgetOverviewCard
          title="Spent So Far"
          value={`£${spentAmount.toLocaleString()}`}
          icon={TrendingDownIcon}
          color="red"
          subtitle={`${budgetUtilization.toFixed(1)}% of budget`}
        />
        <BudgetOverviewCard
          title="Remaining"
          value={`£${remainingBudget.toLocaleString()}`}
          icon={TrendingUpIcon}
          color="green"
          subtitle={`${(100 - budgetUtilization).toFixed(1)}% available`}
        />
        <BudgetOverviewCard
          title="Optimization Score"
          value={`${budgetAnalysis.optimizationScore}%`}
          icon={ChartBarIcon}
          color="purple"
          subtitle="Budget efficiency"
        />
      </div>

      {/* Budget Health Status */}
      <BudgetHealthIndicator
        healthScore={budgetAnalysis.healthScore}
        riskFactors={budgetAnalysis.riskFactors}
        recommendations={budgetAnalysis.quickWins}
      />

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <CategorySpendingBreakdown
          categoryAnalysis={categoryAnalysis}
          industryStandards={budgetOptimization.getIndustryStandards()}
        />

        {/* Spending Timeline */}
        <SpendingTimelineChart
          spendingData={spendingAnalysis.monthlySpending}
          forecastData={forecastData.monthlyForecast}
        />

        {/* Seasonal Insights */}
        <SeasonalPricingInsights
          seasonalData={seasonalInsights}
          weddingDate={wedding.wedding_date}
        />

        {/* Optimization Recommendations */}
        <OptimizationRecommendations
          recommendations={optimizationRecommendations}
          potentialSavings={budgetAnalysis.potentialSavings}
        />
      </div>

      {/* Detailed Budget Forecast */}
      <BudgetForecastPanel
        forecastData={forecastData}
        currentSpending={spentAmount}
        totalBudget={totalBudget}
      />

      {/* Smart Savings Opportunities */}
      <SmartSavingsOpportunities
        opportunities={budgetAnalysis.savingsOpportunities}
        categoryInsights={categoryAnalysis}
      />
    </div>
  );
}

interface BudgetOverviewCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: 'blue' | 'red' | 'green' | 'purple';
  subtitle: string;
}

function BudgetOverviewCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: BudgetOverviewCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
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

interface BudgetHealthIndicatorProps {
  healthScore: number;
  riskFactors: Array<{
    category: string;
    risk: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  recommendations: string[];
}

function BudgetHealthIndicator({
  healthScore,
  riskFactors,
  recommendations,
}: BudgetHealthIndicatorProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const healthColor = getHealthColor(healthScore);
  const healthColorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Budget Health</h3>
        <div
          className={`px-4 py-2 rounded-full border ${healthColorClasses[healthColor]}`}
        >
          <span className="text-sm font-medium">
            {healthScore}% Health Score
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Factors */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Risk Factors
          </h4>
          <div className="space-y-3">
            {riskFactors.slice(0, 3).map((risk, index) => (
              <div
                key={index}
                className="flex items-start p-3 bg-red-50 rounded-lg border border-red-100"
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {risk.category}
                  </p>
                  <p className="text-xs text-red-700 mt-1">{risk.risk}</p>
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    {risk.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Wins */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Wins</h4>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start p-3 bg-green-50 rounded-lg border border-green-100"
              >
                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-900">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategorySpendingBreakdownProps {
  categoryAnalysis: any;
  industryStandards: Record<string, any>;
}

function CategorySpendingBreakdownProps({
  categoryAnalysis,
  industryStandards,
}: CategorySpendingBreakdownProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Spending by Category
      </h3>

      <div className="space-y-4">
        {Object.entries(categoryAnalysis.categories || {}).map(
          ([category, data]: [string, any]) => {
            const industryStandard = industryStandards[category];
            const isOverBudget =
              data.percentage > (industryStandard?.typicalPercentage || 0);

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {category}
                  </span>
                  <div className="text-sm text-gray-600">
                    £{data.spent.toLocaleString()} ({data.percentage.toFixed(1)}
                    %)
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(data.percentage, 100)}%` }}
                  ></div>
                </div>

                {industryStandard && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Industry standard: {industryStandard.typicalPercentage}%
                    </span>
                    {isOverBudget && (
                      <span className="text-red-600 font-medium">
                        {(
                          data.percentage - industryStandard.typicalPercentage
                        ).toFixed(1)}
                        % over
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

interface SpendingTimelineChartProps {
  spendingData: Array<{ month: string; amount: number; category: string }>;
  forecastData: Array<{ month: string; projected: number; confidence: number }>;
}

function SpendingTimelineChart({
  spendingData,
  forecastData,
}: SpendingTimelineChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Spending Timeline
      </h3>

      <div className="space-y-4">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Actual Spending</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-300 rounded-full mr-2"></div>
            <span className="text-gray-600">Projected Spending</span>
          </div>
        </div>

        {/* Simplified chart visualization */}
        <div className="space-y-3">
          {spendingData.slice(-6).map((data, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{data.month}</span>
                <span className="font-medium text-gray-900">
                  £{data.amount.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${(data.amount / Math.max(...spendingData.map((d) => d.amount))) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Forecast section */}
        {forecastData.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Upcoming Projections
            </h4>
            <div className="space-y-2">
              {forecastData.slice(0, 3).map((forecast, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600">{forecast.month}</span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">
                      £{forecast.projected.toLocaleString()}
                    </span>
                    <div className="text-xs text-gray-500">
                      {forecast.confidence}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SeasonalPricingInsightsProps {
  seasonalData: any;
  weddingDate: string;
}

function SeasonalPricingInsights({
  seasonalData,
  weddingDate,
}: SeasonalPricingInsightsProps) {
  const weddingMonth = new Date(weddingDate).toLocaleString('default', {
    month: 'long',
  });
  const seasonalMultiplier =
    seasonalData.seasonalMultipliers?.[weddingMonth.toLowerCase()] || 1;
  const isPeakSeason = seasonalMultiplier > 1.1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Seasonal Pricing Insights
      </h3>

      <div className="space-y-4">
        {/* Wedding month impact */}
        <div
          className={`p-4 rounded-lg border ${isPeakSeason ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
        >
          <div className="flex items-center">
            <CalendarIcon
              className={`w-5 h-5 mr-3 ${isPeakSeason ? 'text-red-600' : 'text-green-600'}`}
            />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Your Wedding Month: {weddingMonth}
              </h4>
              <p
                className={`text-xs mt-1 ${isPeakSeason ? 'text-red-700' : 'text-green-700'}`}
              >
                {isPeakSeason
                  ? `Peak season - prices ${((seasonalMultiplier - 1) * 100).toFixed(0)}% higher on average`
                  : `Off-peak season - potential savings of ${((1 - seasonalMultiplier) * 100).toFixed(0)}%`}
              </p>
            </div>
          </div>
        </div>

        {/* Category-specific seasonal impacts */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Category Seasonal Impact
          </h4>
          {Object.entries(seasonalData.categoryImpacts || {}).map(
            ([category, impact]: [string, any]) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700 capitalize">
                  {category}
                </span>
                <div className="text-right">
                  <span
                    className={`text-sm font-medium ${impact.multiplier > 1 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {impact.multiplier > 1 ? '+' : ''}
                    {((impact.multiplier - 1) * 100).toFixed(0)}%
                  </span>
                  <p className="text-xs text-gray-500">{impact.reason}</p>
                </div>
              </div>
            ),
          )}
        </div>

        {/* Best months for savings */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Best Months for Savings
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {seasonalData.bestSavingMonths
              ?.slice(0, 4)
              .map((month: any, index: number) => (
                <div
                  key={index}
                  className="text-green-700 bg-green-50 px-2 py-1 rounded text-center"
                >
                  {month.month} ({month.savings}% off)
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface OptimizationRecommendationsProps {
  recommendations: Array<{
    category: string;
    suggestion: string;
    potentialSaving: number;
    difficulty: 'easy' | 'medium' | 'hard';
    impact: 'high' | 'medium' | 'low';
  }>;
  potentialSavings: number;
}

function OptimizationRecommendations({
  recommendations,
  potentialSavings,
}: OptimizationRecommendationsProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Optimization Opportunities
        </h3>
        <div className="text-sm text-green-600 font-medium">
          Total Savings: £{potentialSavings.toLocaleString()}
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.slice(0, 4).map((rec, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {rec.category}
                </h4>
                <p className="text-sm text-gray-600">{rec.suggestion}</p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-sm font-medium text-green-600 mb-1">
                  Save £{rec.potentialSaving.toLocaleString()}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(rec.difficulty)}`}
                >
                  {rec.difficulty}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">
                Impact: {rec.impact}
              </span>
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Apply Recommendation →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BudgetForecastPanelProps {
  forecastData: any;
  currentSpending: number;
  totalBudget: number;
}

function BudgetForecastPanel({
  forecastData,
  currentSpending,
  totalBudget,
}: BudgetForecastPanelProps) {
  const projectedTotal = forecastData.projectedTotal || currentSpending;
  const isOverBudget = projectedTotal > totalBudget;
  const variance = projectedTotal - totalBudget;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Budget Forecast
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current vs Projected */}
        <div className="text-center">
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">
              £{projectedTotal.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Projected Total</div>
          </div>
          <div
            className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}
          >
            {isOverBudget ? 'Over' : 'Under'} budget by £
            {Math.abs(variance).toLocaleString()}
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="text-center">
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">
              {forecastData.confidence || 85}%
            </div>
            <div className="text-sm text-gray-600">Forecast Confidence</div>
          </div>
          <div className="text-xs text-gray-500">
            Based on {forecastData.dataPoints || 12} months of data
          </div>
        </div>

        {/* Risk Level */}
        <div className="text-center">
          <div className="mb-3">
            <div
              className={`text-2xl font-bold ${
                isOverBudget
                  ? 'text-red-600'
                  : variance < -1000
                    ? 'text-green-600'
                    : 'text-yellow-600'
              }`}
            >
              {isOverBudget ? 'HIGH' : variance < -1000 ? 'LOW' : 'MEDIUM'}
            </div>
            <div className="text-sm text-gray-600">Budget Risk</div>
          </div>
          <div className="text-xs text-gray-500">
            {isOverBudget ? 'Consider cost reductions' : 'Budget on track'}
          </div>
        </div>
      </div>

      {/* Forecast timeline */}
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Remaining Spending Forecast
        </h4>
        <div className="space-y-2">
          {forecastData.monthlyBreakdown
            ?.slice(0, 6)
            .map((month: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{month.month}</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">
                    £{month.projected.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({month.category})
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

interface SmartSavingsOpportunitiesProps {
  opportunities: Array<{
    title: string;
    description: string;
    potentialSaving: number;
    effort: 'low' | 'medium' | 'high';
    category: string;
    actionUrl?: string;
  }>;
  categoryInsights: any;
}

function SmartSavingsOpportunities({
  opportunities,
  categoryInsights,
}: SmartSavingsOpportunitiesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <LightBulbIcon className="w-6 h-6 text-yellow-500 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Smart Savings Opportunities
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {opportunities.slice(0, 6).map((opportunity, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {opportunity.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {opportunity.description}
                </p>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {opportunity.category}
                </span>
              </div>
              <div className="ml-4 text-right">
                <div className="text-sm font-medium text-green-600 mb-1">
                  Save £{opportunity.potentialSaving.toLocaleString()}
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    opportunity.effort === 'low'
                      ? 'bg-green-100 text-green-800'
                      : opportunity.effort === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {opportunity.effort} effort
                </div>
              </div>
            </div>

            {opportunity.actionUrl && (
              <button className="w-full mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium text-left">
                Take Action →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
