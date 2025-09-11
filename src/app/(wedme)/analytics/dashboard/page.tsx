import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

// Import analytics engines
import { CoupleInsightsEngine } from '@/lib/wedme/analytics/couple-insights-engine';
import { BudgetOptimizationSystem } from '@/lib/wedme/analytics/budget-optimization';
import { VendorPerformanceAnalyticsForCouples } from '@/lib/wedme/analytics/vendor-performance-couples';
import { TimelineIntelligenceSystem } from '@/lib/wedme/analytics/timeline-intelligence';
import { SocialWeddingAnalyticsSystem } from '@/lib/wedme/analytics/social-wedding-analytics';
import { MobileAnalyticsExperience } from '@/lib/wedme/analytics/mobile-analytics-experience';

// Import components
import { PersonalizedInsightsPanels } from '@/components/wedme/analytics/PersonalizedInsightsPanels';
import { BudgetOptimizationWidget } from '@/components/wedme/analytics/BudgetOptimizationWidget';
import { VendorPerformanceInsights } from '@/components/wedme/analytics/VendorPerformanceInsights';
import { TimelineProgressTracker } from '@/components/wedme/analytics/TimelineProgressTracker';
import { WeddingMomentumMeter } from '@/components/wedme/analytics/WeddingMomentumMeter';

export default function AnalyticsDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wedding Analytics
          </h1>
          <p className="text-gray-600">
            Your personalized insights and optimization recommendations
          </p>
        </div>

        {/* Loading State */}
        <Suspense fallback={<DashboardSkeleton />}>
          <AnalyticsDashboardContent />
        </Suspense>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

async function AnalyticsDashboardContent() {
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
          Create your wedding profile to access analytics
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
  const coupleInsights = new CoupleInsightsEngine();
  const budgetOptimization = new BudgetOptimizationSystem();
  const vendorAnalytics = new VendorPerformanceAnalyticsForCouples();
  const timelineIntelligence = new TimelineIntelligenceSystem();
  const socialAnalytics = new SocialWeddingAnalyticsSystem();
  const mobileExperience = new MobileAnalyticsExperience();

  // Get analytics data
  const [
    insights,
    budgetAnalysis,
    vendorPerformance,
    timelineOptimization,
    socialInsights,
    mobileMetrics,
  ] = await Promise.all([
    coupleInsights.getPersonalizedInsights(user.id, wedding.id),
    budgetOptimization.analyzeBudgetHealth(user.id, wedding.id),
    vendorAnalytics.getVendorAnalysisReport(user.id, wedding.id),
    timelineIntelligence.optimizeWeddingTimeline(user.id, wedding.id),
    socialAnalytics.getSocialWeddingInsights(user.id, wedding.id),
    mobileExperience.getMobileOptimizedAnalytics(user.id, wedding.id),
  ]);

  return (
    <div className="space-y-8">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Planning Health"
          value={`${insights.overallScore}%`}
          change="+5%"
          positive={true}
          description="Overall wedding planning progress"
        />
        <MetricCard
          title="Budget Optimization"
          value={`${budgetAnalysis.optimizationScore}%`}
          change="+12%"
          positive={true}
          description="Cost savings identified"
        />
        <MetricCard
          title="Timeline Efficiency"
          value={`${timelineOptimization.criticalPath.efficiency}%`}
          change="-2%"
          positive={false}
          description="Critical path optimization"
        />
        <MetricCard
          title="Guest Engagement"
          value={`${Math.round(socialInsights.guestEngagement.averageEngagement * 100)}%`}
          change="+8%"
          positive={true}
          description="RSVP and interaction rates"
        />
      </div>

      {/* Main Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Personalized Insights Panel */}
        <div className="lg:col-span-8">
          <PersonalizedInsightsPanels insights={insights} />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4">
          <QuickActionsPanel
            nextSteps={insights.nextSteps}
            opportunities={insights.opportunities}
          />
        </div>
      </div>

      {/* Budget and Vendor Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetOptimizationWidget
          budgetAnalysis={budgetAnalysis}
          recommendations={budgetAnalysis.optimizationRecommendations}
        />
        <VendorPerformanceInsights
          vendorAnalysis={vendorPerformance}
          recommendations={vendorPerformance.recommendations}
        />
      </div>

      {/* Timeline and Social Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimelineProgressTracker
          timeline={timelineOptimization}
          milestones={timelineOptimization.milestones}
        />
        <SocialEngagementPanel
          socialInsights={socialInsights}
          viralAnalysis={socialInsights.viralAnalysis}
        />
      </div>

      {/* Wedding Momentum Meter */}
      <div className="lg:col-span-full">
        <WeddingMomentumMeter
          insights={insights}
          budgetHealth={budgetAnalysis.healthScore}
          timelineEfficiency={timelineOptimization.criticalPath.efficiency}
          socialEngagement={socialInsights.guestEngagement.averageEngagement}
          mobileExperience={mobileMetrics.userExperienceScore}
        />
      </div>

      {/* Mobile Experience Insights */}
      <div className="lg:col-span-full">
        <MobileExperienceInsights
          mobileMetrics={mobileMetrics}
          touchOptimization={mobileMetrics.touchOptimization}
          offlineCapability={mobileMetrics.offlineCapability}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  description: string;
}

function MetricCard({
  title,
  value,
  change,
  positive,
  description,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div
          className={`flex items-center text-sm ${
            positive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {positive ? (
            <ArrowUpIcon className="w-4 h-4 mr-1" />
          ) : (
            <ArrowDownIcon className="w-4 h-4 mr-1" />
          )}
          {change}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    </div>
  );
}

interface QuickActionsPanelProps {
  nextSteps: string[];
  opportunities: Array<{
    type: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedSavings?: number;
    actionUrl?: string;
  }>;
}

function QuickActionsPanel({
  nextSteps,
  opportunities,
}: QuickActionsPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quick Actions
      </h3>

      {/* Next Steps */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Priority Tasks
        </h4>
        <div className="space-y-2">
          {nextSteps.slice(0, 3).map((step, index) => (
            <div
              key={index}
              className="flex items-center p-3 bg-blue-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {index + 1}
                  </span>
                </div>
              </div>
              <p className="ml-3 text-sm text-gray-700">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Opportunities
        </h4>
        <div className="space-y-3">
          {opportunities.slice(0, 2).map((opportunity, index) => (
            <div
              key={index}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900">
                  {opportunity.title}
                </h5>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    opportunity.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : opportunity.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {opportunity.priority}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                {opportunity.description}
              </p>
              {opportunity.estimatedSavings && (
                <p className="text-xs font-medium text-green-600">
                  Potential savings: £{opportunity.estimatedSavings}
                </p>
              )}
              {opportunity.actionUrl && (
                <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Take Action →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SocialEngagementPanelProps {
  socialInsights: any;
  viralAnalysis: any[];
}

function SocialEngagementPanel({
  socialInsights,
  viralAnalysis,
}: SocialEngagementPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Social Engagement
      </h3>

      <div className="space-y-4">
        {/* Guest Engagement Overview */}
        <div className="p-4 bg-purple-50 rounded-lg">
          <h4 className="text-sm font-medium text-purple-900 mb-2">
            Guest Engagement
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-purple-600">RSVP Rate</p>
              <p className="text-lg font-semibold text-purple-900">
                {Math.round(
                  socialInsights.guestEngagement.averageEngagement * 100,
                )}
                %
              </p>
            </div>
            <div>
              <p className="text-xs text-purple-600">Active Guests</p>
              <p className="text-lg font-semibold text-purple-900">
                {socialInsights.guestEngagement.activeGuests || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Viral Potential */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            Viral Potential
          </h4>
          {viralAnalysis.slice(0, 2).map((analysis, index) => (
            <div key={index} className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700">
                  {analysis.category}
                </span>
                <span className="text-xs font-medium text-green-900">
                  {Math.round(analysis.score * 100)}%
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-1.5">
                <div
                  className="bg-green-600 h-1.5 rounded-full"
                  style={{ width: `${analysis.score * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MobileExperienceInsightsProps {
  mobileMetrics: any;
  touchOptimization: any;
  offlineCapability: any;
}

function MobileExperienceInsights({
  mobileMetrics,
  touchOptimization,
  offlineCapability,
}: MobileExperienceInsightsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Mobile Experience
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Experience Score */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 relative">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {Math.round(mobileMetrics.userExperienceScore * 100)}
              </span>
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">UX Score</h4>
          <p className="text-xs text-gray-500">Overall mobile experience</p>
        </div>

        {/* Touch Optimization */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-xl font-bold text-green-600">
                {Math.round(touchOptimization.averageTargetSize)}px
              </span>
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            Touch Targets
          </h4>
          <p className="text-xs text-gray-500">Average tap target size</p>
        </div>

        {/* Offline Capability */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 relative">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-xl font-bold text-yellow-600">
                {Math.round(offlineCapability.offlineReadiness * 100)}%
              </span>
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            Offline Ready
          </h4>
          <p className="text-xs text-gray-500">Works without internet</p>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {mobileMetrics.quickInsights
          ?.slice(0, 4)
          .map((insight: any, index: number) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-1">
                {insight.title}
              </h5>
              <p className="text-xs text-gray-600">{insight.description}</p>
              {insight.actionRequired && (
                <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Optimize →
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
