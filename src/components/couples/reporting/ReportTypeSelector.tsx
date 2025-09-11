'use client';

import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyPoundIcon,
  UsersIcon,
  ShareIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CoupleReportType } from '@/types/couple-reporting';

interface ReportTypeSelectorProps {
  selectedType: CoupleReportType;
  onTypeSelect: (type: CoupleReportType) => void;
  availableTypes: CoupleReportType[];
}

export function ReportTypeSelector({
  selectedType,
  onTypeSelect,
  availableTypes,
}: ReportTypeSelectorProps) {
  const reportTypes = {
    progress: {
      id: 'progress',
      title: 'Progress Report',
      description: 'Track milestones, timeline, and overall planning progress',
      icon: <ChartBarIcon className="w-6 h-6" />,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600',
    },
    budget: {
      id: 'budget',
      title: 'Budget Analysis',
      description: 'Optimize spending, find savings, and track expenses',
      icon: <CurrencyPoundIcon className="w-6 h-6" />,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
    },
    vendor_performance: {
      id: 'vendor_performance',
      title: 'Vendor Report Card',
      description:
        'Rate suppliers, track communication, and assess performance',
      icon: <UsersIcon className="w-6 h-6" />,
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
    },
    social_share: {
      id: 'social_share',
      title: 'Social Highlights',
      description: 'Create Instagram-worthy content and shareable moments',
      icon: <ShareIcon className="w-6 h-6" />,
      color: 'pink',
      gradient: 'from-pink-500 to-rose-600',
    },
    timeline: {
      id: 'timeline',
      title: 'Timeline Overview',
      description: 'Visualize your wedding timeline and critical milestones',
      icon: <CalendarDaysIcon className="w-6 h-6" />,
      color: 'orange',
      gradient: 'from-orange-500 to-amber-600',
    },
    final_summary: {
      id: 'final_summary',
      title: 'Complete Summary',
      description: 'Comprehensive overview of your entire wedding journey',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'indigo',
      gradient: 'from-indigo-500 to-blue-600',
    },
  } as const;

  return (
    <div className="report-type-selector">
      <div className="selector-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Report
        </h2>
        <p className="text-gray-600">
          Select the type of insights you'd like to generate
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableTypes.map((type, index) => {
          const reportType = reportTypes[type];
          const isSelected = selectedType === type;

          return (
            <motion.div
              key={reportType.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ReportTypeCard
                reportType={reportType}
                isSelected={isSelected}
                onSelect={() => onTypeSelect(type)}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface ReportTypeCardProps {
  reportType: {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

function ReportTypeCard({
  reportType,
  isSelected,
  onSelect,
}: ReportTypeCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      className={`report-type-card w-full p-6 rounded-xl text-left transition-all duration-200 ${
        isSelected
          ? 'bg-white shadow-lg border-2 border-transparent bg-gradient-to-r from-white to-gray-50 ring-2 ring-offset-2 ring-blue-500'
          : 'bg-white hover:shadow-md border border-gray-200 hover:border-gray-300'
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 p-3 rounded-lg bg-gradient-to-r ${reportType.gradient} ${
            isSelected ? 'shadow-lg' : ''
          }`}
        >
          <div className="text-white">{reportType.icon}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {reportType.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {reportType.description}
          </p>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0"
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </motion.div>
        )}
      </div>

      {/* Enhanced features for selected card */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-gray-100"
        >
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              Ready to generate
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
              Shareable
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
              AI-powered
            </span>
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
