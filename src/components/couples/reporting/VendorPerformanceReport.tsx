'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  StarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckBadgeIcon,
  UsersIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  HeartIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { CircularProgress } from '../visualization/CircularProgress';
import {
  SelectedVendor,
  VendorReport,
  VendorPerformanceMetric,
  CommunicationScore,
  VendorTimelineScore,
  SatisfactionScore,
  VendorComparison,
  RecommendationScore,
} from '@/types/couple-reporting';

interface VendorPerformanceReportProps {
  vendors: SelectedVendor[];
  onGenerateReport: () => void;
  isPending: boolean;
}

export function VendorPerformanceReport({
  vendors,
  onGenerateReport,
  isPending,
}: VendorPerformanceReportProps) {
  const [vendorReports, setVendorReports] = useState<VendorReport[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      vendors.map((vendor) => generateVendorPerformanceReport(vendor.id)),
    ).then(setVendorReports);
  }, [vendors]);

  if (vendorReports.length === 0) {
    return <VendorPerformanceReportSkeleton />;
  }

  const overallScore = calculateOverallVendorScore(vendorReports);

  return (
    <div className="vendor-performance-report space-y-8">
      {/* Header */}
      <motion.div
        className="report-header text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Vendor Performance Report
        </h2>
        <p className="text-gray-600">
          Assess your dream team and get AI-powered insights
        </p>
      </motion.div>

      {/* Overall Performance Overview */}
      <motion.div
        className="performance-overview bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🌟 Your Dream Team Performance
          </h3>

          <div className="flex items-center justify-center mb-6">
            <CircularProgress
              percentage={overallScore}
              size={180}
              strokeWidth={12}
              color="#10b981"
            >
              <div className="score-center text-center">
                <span className="text-4xl font-bold text-green-600">
                  {overallScore.toFixed(1)}
                </span>
                <span className="block text-lg text-gray-600 font-medium">
                  Overall Score
                </span>
              </div>
            </CircularProgress>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PerformanceMetricCard
              title="Communication"
              score={calculateCategoryAverage(vendorReports, 'communication')}
              icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
            />
            <PerformanceMetricCard
              title="Timeliness"
              score={calculateCategoryAverage(vendorReports, 'timeliness')}
              icon={<ClockIcon className="w-5 h-5" />}
            />
            <PerformanceMetricCard
              title="Quality"
              score={calculateCategoryAverage(vendorReports, 'quality')}
              icon={<CheckBadgeIcon className="w-5 h-5" />}
            />
            <PerformanceMetricCard
              title="Value"
              score={calculateCategoryAverage(vendorReports, 'value')}
              icon={<TrophyIcon className="w-5 h-5" />}
            />
          </div>
        </div>
      </motion.div>

      {/* Individual Vendor Performance */}
      <motion.div
        className="vendor-performance-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Individual Vendor Performance
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <UsersIcon className="w-4 h-4 mr-1" />
            <span>{vendorReports.length} vendors assessed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vendorReports.map((report, index) => (
            <VendorPerformanceCard
              key={`vendor-${index}`}
              vendorReport={report}
              onViewDetails={() =>
                setSelectedVendor(report.vendorPerformance[0]?.vendorId || '')
              }
              isSelected={
                selectedVendor === report.vendorPerformance[0]?.vendorId
              }
            />
          ))}
        </div>
      </motion.div>

      {/* Performance Comparison Chart */}
      <motion.div
        className="performance-comparison"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          📊 Performance Comparison
        </h3>
        <VendorComparisonChart
          vendors={vendorReports}
          metrics={['communication', 'timeliness', 'quality', 'value']}
        />
      </motion.div>

      {/* AI Recommendations */}
      <motion.div
        className="recommendation-engine"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🎯 AI-Powered Recommendations
        </h3>
        <div className="recommendations-list space-y-4">
          {generateVendorRecommendations(vendorReports).map(
            (recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onApply={() => applyRecommendation(recommendation.id)}
              />
            ),
          )}
        </div>
      </motion.div>

      {/* Top Performers & Concerning Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <motion.div
          className="top-performers"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <TrophyIcon className="w-6 h-6 text-yellow-500 mr-2" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {getTopPerformers(vendorReports).map((vendor, index) => (
              <TopPerformerCard
                key={vendor.vendorId}
                vendor={vendor}
                rank={index + 1}
              />
            ))}
          </div>
        </motion.div>

        {/* Areas for Improvement */}
        <motion.div
          className="concerning-vendors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mr-2" />
            Areas for Improvement
          </h3>
          <div className="space-y-3">
            {getConcerningVendors(vendorReports).map((vendor) => (
              <ConcernCard key={vendor.vendorId} vendor={vendor} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Vendor Testimonials & Feedback */}
      <motion.div
        className="vendor-testimonials"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          💌 Your Feedback Highlights
        </h3>
        <div className="testimonials-carousel grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {extractVendorTestimonials(vendorReports).map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              onShare={() => shareTestimonial(testimonial.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="report-actions flex flex-col sm:flex-row gap-4 pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <button
          onClick={onGenerateReport}
          disabled={isPending}
          className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Compiling Insights...
            </>
          ) : (
            <>
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Generate Vendor Report Card
            </>
          )}
        </button>

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center">
          <UsersIcon className="w-5 h-5 mr-2" />
          Share Feedback with Vendors
        </button>
      </motion.div>
    </div>
  );
}

interface PerformanceMetricCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
}

function PerformanceMetricCard({
  title,
  score,
  icon,
}: PerformanceMetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="performance-metric-card bg-white p-4 rounded-lg border border-gray-200 text-center">
      <div className="flex items-center justify-center mb-2">
        <div className={getScoreColor(score)}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${getScoreColor(score)} mb-1`}>
        {score.toFixed(0)}%
      </div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

interface VendorPerformanceCardProps {
  vendorReport: VendorReport;
  onViewDetails: () => void;
  isSelected: boolean;
}

function VendorPerformanceCard({
  vendorReport,
  onViewDetails,
  isSelected,
}: VendorPerformanceCardProps) {
  const vendor = vendorReport.vendorPerformance[0];
  if (!vendor) return null;

  return (
    <motion.div
      className={`vendor-performance-card bg-white p-6 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:shadow-sm'
      }`}
      onClick={onViewDetails}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {vendor.vendorName}
          </h4>
          <p className="text-sm text-gray-500 capitalize">{vendor.category}</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {vendor.overallScore.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">Overall</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <MetricBar label="Responsiveness" value={vendor.responsiveness} />
        <MetricBar label="Quality" value={vendor.quality} />
        <MetricBar label="Timeliness" value={vendor.timeliness} />
        <MetricBar label="Value" value={vendor.valueForMoney} />
      </div>

      {/* Recent Activity */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Last interaction:</span>
        <span>{new Date(vendor.lastInteraction).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Total interactions:</span>
        <span>{vendor.totalInteractions}</span>
      </div>

      {/* Star Rating */}
      <div className="flex items-center mt-4">
        {[...Array(5)].map((_, i) => (
          <StarIconSolid
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(vendor.overallScore / 20)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {(vendor.overallScore / 20).toFixed(1)}/5
        </span>
      </div>
    </motion.div>
  );
}

interface MetricBarProps {
  label: string;
  value: number;
}

function MetricBar({ label, value }: MetricBarProps) {
  const getBarColor = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 80) return 'bg-blue-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="metric-bar">
      <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface VendorComparisonChartProps {
  vendors: VendorReport[];
  metrics: string[];
}

function VendorComparisonChart({
  vendors,
  metrics,
}: VendorComparisonChartProps) {
  return (
    <div className="vendor-comparison-chart bg-white rounded-xl p-6 border border-gray-200">
      <div className="space-y-6">
        {metrics.map((metric) => (
          <div key={metric} className="metric-comparison">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
              {metric}
            </h4>
            <div className="space-y-3">
              {vendors.map((vendorReport, index) => {
                const vendor = vendorReport.vendorPerformance[0];
                if (!vendor) return null;

                const value = getMetricValue(vendor, metric);

                return (
                  <div
                    key={vendor.vendorId}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-32 text-sm text-gray-600 truncate">
                      {vendor.vendorName}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${value}%` }}
                        >
                          {value.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: {
    id: string;
    type: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    timeline: string;
  };
  onApply: () => void;
}

function RecommendationCard({
  recommendation,
  onApply,
}: RecommendationCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'communication':
        return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case 'timeline':
        return <ClockIcon className="w-5 h-5" />;
      case 'quality':
        return <CheckBadgeIcon className="w-5 h-5" />;
      default:
        return <LightBulbIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'communication':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'timeline':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'quality':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div
      className={`recommendation-card p-6 rounded-xl border ${getTypeColor(recommendation.type)}`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">{getTypeIcon(recommendation.type)}</div>

        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {recommendation.title}
          </h4>
          <p className="text-gray-600 mb-4">{recommendation.description}</p>

          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
            <span>
              Impact: <strong>{recommendation.impact}</strong>
            </span>
            <span>
              Effort: <strong>{recommendation.effort}</strong>
            </span>
            <span>
              Timeline: <strong>{recommendation.timeline}</strong>
            </span>
          </div>

          <button
            onClick={onApply}
            className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300"
          >
            Apply Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}

interface TopPerformerCardProps {
  vendor: VendorPerformanceMetric;
  rank: number;
}

function TopPerformerCard({ vendor, rank }: TopPerformerCardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="top-performer-card bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-4">
      <div className="flex-shrink-0 text-2xl">{getRankIcon(rank)}</div>

      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{vendor.vendorName}</h4>
        <p className="text-sm text-gray-500 capitalize">{vendor.category}</p>
      </div>

      <div className="text-right">
        <div className="text-lg font-bold text-green-600">
          {vendor.overallScore.toFixed(1)}
        </div>
        <div className="text-xs text-gray-500">score</div>
      </div>
    </div>
  );
}

interface ConcernCardProps {
  vendor: VendorPerformanceMetric;
}

function ConcernCard({ vendor }: ConcernCardProps) {
  const getLowestMetric = (vendor: VendorPerformanceMetric) => {
    const metrics = [
      { name: 'Responsiveness', value: vendor.responsiveness },
      { name: 'Quality', value: vendor.quality },
      { name: 'Timeliness', value: vendor.timeliness },
      { name: 'Value', value: vendor.valueForMoney },
    ];

    return metrics.reduce((lowest, current) =>
      current.value < lowest.value ? current : lowest,
    );
  };

  const lowestMetric = getLowestMetric(vendor);

  return (
    <div className="concern-card bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{vendor.vendorName}</h4>
          <p className="text-sm text-gray-600">
            Lowest in <strong>{lowestMetric.name}</strong> (
            {lowestMetric.value.toFixed(0)}%)
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Consider discussing improvement opportunities
          </p>
        </div>
      </div>
    </div>
  );
}

interface TestimonialCardProps {
  testimonial: {
    id: string;
    vendorName: string;
    rating: number;
    text: string;
    category: string;
  };
  onShare: () => void;
}

function TestimonialCard({ testimonial, onShare }: TestimonialCardProps) {
  return (
    <div className="testimonial-card bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">
            {testimonial.vendorName}
          </h4>
          <p className="text-sm text-gray-500 capitalize">
            {testimonial.category}
          </p>
        </div>

        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <StarIconSolid
              key={i}
              className={`w-4 h-4 ${
                i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {testimonial.text}
      </p>

      <button
        onClick={onShare}
        className="w-full bg-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-700 transition-colors flex items-center justify-center"
      >
        <HeartIcon className="w-4 h-4 mr-1" />
        Share This Review
      </button>
    </div>
  );
}

function VendorPerformanceReportSkeleton() {
  return (
    <div className="vendor-performance-skeleton space-y-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
      </div>

      <div className="animate-pulse bg-gray-100 rounded-2xl h-64"></div>

      <div className="grid grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 rounded-xl h-32"
          ></div>
        ))}
      </div>
    </div>
  );
}

// Utility Functions
function calculateOverallVendorScore(vendorReports: VendorReport[]): number {
  if (vendorReports.length === 0) return 0;

  const totalScore = vendorReports.reduce((sum, report) => {
    return sum + (report.overallScore || 0);
  }, 0);

  return totalScore / vendorReports.length;
}

function calculateCategoryAverage(
  vendorReports: VendorReport[],
  category: string,
): number {
  if (vendorReports.length === 0) return 0;

  const scores = vendorReports.map((report) => {
    const vendor = report.vendorPerformance[0];
    return getMetricValue(vendor, category);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function getMetricValue(
  vendor: VendorPerformanceMetric,
  metric: string,
): number {
  switch (metric) {
    case 'communication':
      return vendor.responsiveness;
    case 'timeliness':
      return vendor.timeliness;
    case 'quality':
      return vendor.quality;
    case 'value':
      return vendor.valueForMoney;
    default:
      return vendor.overallScore;
  }
}

function getTopPerformers(
  vendorReports: VendorReport[],
): VendorPerformanceMetric[] {
  return vendorReports
    .map((report) => report.vendorPerformance[0])
    .filter((vendor) => vendor)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3);
}

function getConcerningVendors(
  vendorReports: VendorReport[],
): VendorPerformanceMetric[] {
  return vendorReports
    .map((report) => report.vendorPerformance[0])
    .filter((vendor) => vendor && vendor.overallScore < 75)
    .sort((a, b) => a.overallScore - b.overallScore);
}

async function generateVendorPerformanceReport(
  vendorId: string,
): Promise<VendorReport> {
  // Mock implementation - would connect to actual performance analysis service
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    vendorPerformance: [
      {
        vendorId,
        vendorName: `Vendor ${vendorId}`,
        category: 'photography',
        overallScore: 85 + Math.random() * 15,
        responsiveness: 80 + Math.random() * 20,
        quality: 85 + Math.random() * 15,
        timeliness: 75 + Math.random() * 25,
        professionalism: 90 + Math.random() * 10,
        valueForMoney: 70 + Math.random() * 30,
        lastInteraction: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
        totalInteractions: Math.floor(Math.random() * 20) + 5,
      },
    ],
    communicationQuality: [],
    timelineAdherence: [],
    clientSatisfaction: [],
    recommendationStrength: {
      overallScore: 85,
      topPerformers: [],
      concerningVendors: [],
      replacementSuggestions: [],
    },
    comparativeAnalysis: [],
    overallScore: 85,
  };
}

function generateVendorRecommendations(vendorReports: VendorReport[]) {
  return [
    {
      id: '1',
      type: 'communication',
      title: 'Improve Communication Flow',
      description:
        'Set up regular check-ins with vendors to ensure better coordination',
      impact: 'High',
      effort: 'Low',
      timeline: '1 week',
    },
    {
      id: '2',
      type: 'timeline',
      title: 'Timeline Buffer Optimization',
      description: 'Add buffer time for critical milestones to reduce stress',
      impact: 'Medium',
      effort: 'Medium',
      timeline: '2 weeks',
    },
  ];
}

function extractVendorTestimonials(vendorReports: VendorReport[]) {
  return [
    {
      id: '1',
      vendorName: 'Amazing Photography',
      category: 'photography',
      rating: 5,
      text: 'Absolutely incredible work! They captured our special moments perfectly and went above and beyond our expectations.',
    },
    {
      id: '2',
      vendorName: 'Dream Venue',
      category: 'venue',
      rating: 5,
      text: 'The venue was stunning and the staff was incredibly professional. Made our wedding day absolutely magical!',
    },
  ];
}

async function applyRecommendation(recommendationId: string): Promise<void> {
  console.log('Applying recommendation:', recommendationId);
}

async function shareTestimonial(testimonialId: string): Promise<void> {
  console.log('Sharing testimonial:', testimonialId);
}
