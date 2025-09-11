'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Users,
  Database,
  Cloud,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Camera,
  Heart,
} from 'lucide-react';

interface SecurityStatusOverviewProps {
  metrics: {
    overallScore: number;
    guestPrivacyCompliance: number;
    dataEncryptionStatus: number;
    accessControlHealth: number;
    backupStatus: number;
    lastSecurityScan: Date;
  };
  weddingStats: {
    totalGuests: number;
    guestsWithPrivacyConsent: number;
    photosProtected: number;
    dataEncrypted: boolean;
    lastBackup: Date;
  };
}

/**
 * WS-338 Team D: Security status overview for couples
 * Simplified security metrics with wedding context
 */
export const SecurityStatusOverview: React.FC<SecurityStatusOverviewProps> = ({
  metrics,
  weddingStats,
}) => {
  const securityCategories = [
    {
      id: 'guest_privacy',
      title: 'Guest Privacy',
      score: metrics.guestPrivacyCompliance,
      icon: Users,
      description: 'Guest consent and privacy controls',
      weddingContext: `${weddingStats.guestsWithPrivacyConsent}/${weddingStats.totalGuests} guests have given consent`,
      status:
        metrics.guestPrivacyCompliance >= 90
          ? 'excellent'
          : metrics.guestPrivacyCompliance >= 75
            ? 'good'
            : 'needs_attention',
    },
    {
      id: 'data_encryption',
      title: 'Data Protection',
      score: metrics.dataEncryptionStatus,
      icon: Lock,
      description: 'Wedding data encryption and security',
      weddingContext: `${weddingStats.photosProtected.toLocaleString()} photos and memories protected`,
      status:
        metrics.dataEncryptionStatus >= 90
          ? 'excellent'
          : metrics.dataEncryptionStatus >= 75
            ? 'good'
            : 'needs_attention',
    },
    {
      id: 'access_control',
      title: 'Access Control',
      score: metrics.accessControlHealth,
      icon: Shield,
      description: 'Who can access your wedding data',
      weddingContext: 'Family and vendors have appropriate access levels',
      status:
        metrics.accessControlHealth >= 90
          ? 'excellent'
          : metrics.accessControlHealth >= 75
            ? 'good'
            : 'needs_attention',
    },
    {
      id: 'backup_status',
      title: 'Backup & Recovery',
      score: metrics.backupStatus,
      icon: Cloud,
      description: 'Wedding data backup and recovery',
      weddingContext: `Last backup: ${weddingStats.lastBackup.toLocaleDateString()}`,
      status:
        metrics.backupStatus >= 90
          ? 'excellent'
          : metrics.backupStatus >= 75
            ? 'good'
            : 'needs_attention',
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return {
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: CheckCircle,
          label: 'Excellent',
        };
      case 'good':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: TrendingUp,
          label: 'Good',
        };
      default:
        return {
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: AlertTriangle,
          label: 'Needs Attention',
        };
    }
  };

  const weddingMilestones = [
    {
      title: 'Wedding Day Security',
      description: 'All systems ready for your special day',
      icon: Calendar,
      status: 'ready',
      details: 'Real-time monitoring active, emergency contacts configured',
    },
    {
      title: 'Photo Protection',
      description: 'Your memories are safe and backed up',
      icon: Camera,
      status: 'active',
      details: `${weddingStats.photosProtected} photos automatically encrypted and backed up`,
    },
    {
      title: 'Guest Experience',
      description: 'Privacy-first sharing for all guests',
      icon: Heart,
      status: 'optimized',
      details: 'Guest privacy preferences respected while maximizing sharing',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Security Score */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <motion.path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke={
                  metrics.overallScore >= 85
                    ? '#10b981'
                    : metrics.overallScore >= 70
                      ? '#3b82f6'
                      : '#f59e0b'
                }
                strokeWidth="3"
                strokeDasharray={`${metrics.overallScore}, 100`}
                initial={{ strokeDasharray: '0, 100' }}
                animate={{ strokeDasharray: `${metrics.overallScore}, 100` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">
                {metrics.overallScore}
              </span>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Wedding Security Score
          </h3>
          <p className="text-sm text-gray-600">
            Your wedding data and guest privacy are well protected
          </p>
        </div>
      </div>

      {/* Security Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Security Categories
        </h3>
        {securityCategories.map((category, index) => {
          const Icon = category.icon;
          const statusConfig = getStatusConfig(category.status);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}
                >
                  <Icon className={`w-5 h-5 ${statusConfig.color}`} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {category.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      <span
                        className={`text-sm font-medium ${statusConfig.color}`}
                      >
                        {category.score}/100
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {category.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        category.status === 'excellent'
                          ? 'bg-green-500'
                          : category.status === 'good'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${category.score}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>

                  {/* Wedding Context */}
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-2">
                    <p className="text-xs text-pink-700">
                      💒 <strong>Wedding Impact:</strong>{' '}
                      {category.weddingContext}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Wedding Security Milestones */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Wedding Day Readiness
        </h3>
        {weddingMilestones.map((milestone, index) => {
          const Icon = milestone.icon;

          return (
            <motion.div
              key={milestone.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {milestone.title}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        milestone.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : milestone.status === 'active'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {milestone.status === 'ready'
                        ? '✅ Ready'
                        : milestone.status === 'active'
                          ? '🔄 Active'
                          : '⚡ Optimized'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {milestone.description}
                  </p>
                  <p className="text-xs text-gray-500">{milestone.details}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          💡 Security Tips for Your Wedding
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>
              Remind guests to update their privacy settings before the wedding
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Review vendor access permissions weekly</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Keep emergency contact information updated</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityStatusOverview;
