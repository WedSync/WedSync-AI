'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShareIcon,
  DownloadIcon,
  HeartIcon,
  CalendarIcon,
  ChartBarIcon,
  UsersIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

import {
  CoupleReportRequest,
  CoupleReport,
  CoupleReportType,
  WeddingDetails,
  ProgressReport,
  ReportVisualStyle,
} from '@/types/couple-reporting';

import { WeddingProgressOverview } from './WeddingProgressOverview';
import { ReportTypeSelector } from './ReportTypeSelector';
import { WeddingProgressReport } from './WeddingProgressReport';
import { BudgetAnalysisReport } from './BudgetAnalysisReport';
import { SocialShareableReport } from './SocialShareableReport';
import { VendorPerformanceReport } from './VendorPerformanceReport';

interface CoupleReportDashboardProps {
  coupleId: string;
  weddingId: string;
  weddingDetails: WeddingDetails;
  onReportGenerate: (reportConfig: CoupleReportRequest) => void;
}

export function CoupleReportDashboard({
  coupleId,
  weddingId,
  weddingDetails,
  onReportGenerate,
}: CoupleReportDashboardProps) {
  const [selectedReportType, setSelectedReportType] =
    useState<CoupleReportType>('progress');
  const [isPending, startTransition] = useTransition();
  const [currentReport, setCurrentReport] = useState<CoupleReport | null>(null);
  const [progressData, setProgressData] = useState<ProgressReport | null>(null);

  useEffect(() => {
    // Load couple's wedding progress data
    loadWeddingProgressData(weddingId).then(setProgressData);
  }, [weddingId]);

  const calculateDaysToWedding = (weddingDate: Date): number => {
    const today = new Date();
    const wedding = new Date(weddingDate);
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getPreferredVisualStyle = (coupleId: string): ReportVisualStyle => {
    // This would typically come from user preferences
    return 'romantic_elegant';
  };

  const handleReportGeneration = (reportType: CoupleReportType) => {
    startTransition(async () => {
      const reportConfig: CoupleReportRequest = {
        coupleId,
        weddingId,
        reportType,
        timeframe: { start: new Date(2024, 0, 1), end: new Date() },
        includeVendors: weddingDetails.selectedVendors.map((v) => v.id),
        sharingSettings: {
          allowPublicSharing: true,
          includeVendorTags: true,
          watermarkStyle: 'elegant',
          socialPlatforms: ['instagram', 'facebook', 'pinterest'],
        },
        visualStyle: getPreferredVisualStyle(coupleId),
        privacyLevel: 'friends',
      };

      onReportGenerate(reportConfig);
    });
  };

  const daysToWedding = calculateDaysToWedding(weddingDetails.weddingDate);

  return (
    <div className="couple-reporting-dashboard min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      {/* Hero Header */}
      <motion.div
        className="dashboard-header relative overflow-hidden bg-white shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100 to-pink-100 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="wedding-header-info text-center">
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-rose-800 mb-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {weddingDetails.coupleNames} Wedding Journey
            </motion.h1>

            <motion.p
              className="text-xl text-rose-600 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {format(new Date(weddingDetails.weddingDate), 'MMMM dd, yyyy')}
            </motion.p>

            <motion.div
              className="days-countdown inline-flex items-center bg-white rounded-full px-6 py-3 shadow-md"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <CalendarIcon className="w-6 h-6 text-rose-500 mr-2" />
              <span className="countdown-number text-3xl font-bold text-rose-800 mr-2">
                {daysToWedding}
              </span>
              <span className="countdown-label text-rose-600 font-medium">
                days to go!
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview Section */}
        <motion.div
          className="progress-overview mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <WeddingProgressOverview progressData={progressData} />
        </motion.div>

        {/* Report Type Selector */}
        <motion.div
          className="report-type-selector mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <ReportTypeSelector
            selectedType={selectedReportType}
            onTypeSelect={setSelectedReportType}
            availableTypes={[
              'progress',
              'budget',
              'vendor_performance',
              'social_share',
            ]}
          />
        </motion.div>

        {/* Dynamic Report Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedReportType}
            className="report-content bg-white rounded-2xl shadow-sm p-6 md:p-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {selectedReportType === 'progress' && (
              <WeddingProgressReport
                progressData={progressData}
                onGenerateReport={() => handleReportGeneration('progress')}
                isPending={isPending}
              />
            )}

            {selectedReportType === 'budget' && (
              <BudgetAnalysisReport
                weddingBudget={weddingDetails.budget}
                onGenerateReport={() => handleReportGeneration('budget')}
                isPending={isPending}
              />
            )}

            {selectedReportType === 'vendor_performance' && (
              <VendorPerformanceReport
                vendors={weddingDetails.selectedVendors}
                onGenerateReport={() =>
                  handleReportGeneration('vendor_performance')
                }
                isPending={isPending}
              />
            )}

            {selectedReportType === 'social_share' && (
              <SocialShareableReport
                weddingHighlights={weddingDetails.highlights}
                onGenerateReport={() => handleReportGeneration('social_share')}
                isPending={isPending}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick Actions Bar */}
        <motion.div
          className="quick-actions-bar mt-8 bg-white rounded-2xl shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionButton
              icon={<ChartBarIcon className="w-6 h-6" />}
              title="Generate Summary"
              description="Complete wedding overview"
              onClick={() => handleReportGeneration('final_summary')}
              color="blue"
            />
            <QuickActionButton
              icon={<ShareIcon className="w-6 h-6" />}
              title="Share Journey"
              description="Create social content"
              onClick={() => setSelectedReportType('social_share')}
              color="pink"
            />
            <QuickActionButton
              icon={<UsersIcon className="w-6 h-6" />}
              title="Vendor Report Card"
              description="Rate your suppliers"
              onClick={() => setSelectedReportType('vendor_performance')}
              color="green"
            />
            <QuickActionButton
              icon={<CameraIcon className="w-6 h-6" />}
              title="Memory Book"
              description="Capture this moment"
              onClick={() => handleReportGeneration('timeline')}
              color="purple"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'blue' | 'pink' | 'green' | 'purple';
}

function QuickActionButton({
  icon,
  title,
  description,
  onClick,
  color,
}: QuickActionButtonProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    pink: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
    green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    purple:
      'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
  };

  return (
    <motion.button
      onClick={onClick}
      className={`p-4 rounded-xl border transition-colors text-left ${colorClasses[color]}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}

// Utility Functions
async function loadWeddingProgressData(
  weddingId: string,
): Promise<ProgressReport> {
  // This would typically fetch from your API
  // For now, return mock data
  return {
    overallProgress: 75,
    milestoneStatus: [],
    vendorCoordination: [],
    timelineAdherence: {
      overallScore: 85,
      onTrackMilestones: 8,
      delayedMilestones: 2,
      criticalPathRisk: 'low',
      bufferDays: 14,
    },
    budgetUtilization: {
      totalBudget: 35000,
      allocatedAmount: 28000,
      spentAmount: 21000,
      remainingAmount: 14000,
      utilizationRate: 0.6,
      projectedTotal: 33500,
      budgetHealth: 'healthy',
    },
    upcomingTasks: [],
    riskFactors: [],
    weddingCountdown: {
      daysRemaining: 120,
      weeksRemaining: 17,
      monthsRemaining: 4,
      milestonesThisWeek: 3,
      upcomingDeadlines: [],
    },
  };
}
