'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Users,
  Camera,
  Lock,
  Key,
  Globe,
  Smartphone,
  Wifi,
  Heart,
  Bell,
  Settings,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { SecurityStatusOverview } from './SecurityStatusOverview';
import { WeddingDataProtection } from './WeddingDataProtection';
import { EmergencyContacts } from './EmergencyContacts';

interface SecurityMetrics {
  overallScore: number;
  guestPrivacyCompliance: number;
  dataEncryptionStatus: number;
  accessControlHealth: number;
  backupStatus: number;
  lastSecurityScan: Date;
}

/**
 * WS-338 Team D: Mobile Security Dashboard for Couples
 * Simplified security status for non-technical users
 * Wedding data protection indicators
 * Emergency security contact information
 */
export const MobileSecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'protection' | 'contacts'
  >('overview');
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    overallScore: 85,
    guestPrivacyCompliance: 92,
    dataEncryptionStatus: 88,
    accessControlHealth: 79,
    backupStatus: 95,
    lastSecurityScan: new Date(Date.now() - 3600000), // 1 hour ago
  });

  const [weddingStats, setWeddingStats] = useState({
    totalGuests: 127,
    guestsWithPrivacyConsent: 98,
    photosProtected: 1240,
    dataEncrypted: true,
    lastBackup: new Date(Date.now() - 21600000), // 6 hours ago
  });

  const [securityAlerts, setSecurityAlerts] = useState([
    {
      id: 'guest_consent_low',
      severity: 'warning' as const,
      title: 'Guest Consent Update Needed',
      description: "29 guests haven't updated their privacy preferences",
      action: 'Send Reminder',
      weddingImpact: 'May affect photo sharing after wedding',
    },
    {
      id: 'backup_success',
      severity: 'info' as const,
      title: 'Backup Completed Successfully',
      description: 'All wedding data backed up 6 hours ago',
      action: 'View Details',
      weddingImpact: 'Your memories are safe',
    },
  ]);

  const getSecurityScoreColor = (score: number) => {
    if (score >= 85)
      return {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
      };
    if (score >= 70)
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      };
    return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const securityScoreConfig = getSecurityScoreColor(
    securityMetrics.overallScore,
  );

  const tabConfig = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'protection', label: 'Data Protection', icon: Lock },
    { id: 'contacts', label: 'Emergency', icon: Phone },
  ] as const;

  return (
    <div className="mobile-security-dashboard min-h-screen bg-gray-50">
      {/* Security Header */}
      <div
        className={`sticky top-0 z-10 ${securityScoreConfig.bg} ${securityScoreConfig.border} border-b`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              {securityMetrics.overallScore >= 85 ? (
                <ShieldCheck
                  className={`w-6 h-6 ${securityScoreConfig.color}`}
                />
              ) : securityMetrics.overallScore >= 70 ? (
                <Shield className={`w-6 h-6 ${securityScoreConfig.color}`} />
              ) : (
                <ShieldAlert
                  className={`w-6 h-6 ${securityScoreConfig.color}`}
                />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Security Dashboard
              </h1>
              <p className={`text-sm ${securityScoreConfig.color}`}>
                {securityMetrics.overallScore >= 85
                  ? '🛡️ Excellent Security'
                  : securityMetrics.overallScore >= 70
                    ? '⚠️ Good Security'
                    : '🚨 Needs Attention'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-2xl font-bold ${securityScoreConfig.color}`}>
              {securityMetrics.overallScore}
            </div>
            <div className="text-xs text-gray-500">Security Score</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-white rounded-lg p-2 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <span className="block font-semibold text-gray-900">
                {weddingStats.guestsWithPrivacyConsent}
              </span>
              <span className="text-xs text-gray-500">Consent</span>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <Camera className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <span className="block font-semibold text-gray-900">
                {weddingStats.photosProtected}
              </span>
              <span className="text-xs text-gray-500">Photos</span>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-green-500" />
              <span className="block font-semibold text-green-600">Safe</span>
              <span className="text-xs text-gray-500">Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className="p-4">
          <div className="space-y-2">
            {securityAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-xl border ${
                  alert.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : alert.severity === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-1 rounded-full ${
                      alert.severity === 'warning'
                        ? 'bg-amber-100'
                        : alert.severity === 'error'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                    }`}
                  >
                    {alert.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : alert.severity === 'error' ? (
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        💒 {alert.weddingImpact}
                      </span>
                      <button
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          alert.severity === 'warning'
                            ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                            : alert.severity === 'error'
                              ? 'text-red-700 bg-red-100 hover:bg-red-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                        }`}
                      >
                        {alert.action}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <SecurityStatusOverview
              metrics={securityMetrics}
              weddingStats={weddingStats}
            />
          )}
          {activeTab === 'protection' && (
            <WeddingDataProtection
              metrics={securityMetrics}
              weddingStats={weddingStats}
            />
          )}
          {activeTab === 'contacts' && <EmergencyContacts />}
        </motion.div>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm">Security Settings</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-purple-700 transition-colors">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Guest Privacy</span>
          </button>
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Last security scan:{' '}
            {securityMetrics.lastSecurityScan.toLocaleString()}
          </p>
          <button className="text-xs text-blue-600 hover:text-blue-700 mt-1">
            Run Security Check
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileSecurityDashboard;
