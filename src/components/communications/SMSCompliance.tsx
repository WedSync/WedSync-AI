'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  FileText,
  Scale,
} from 'lucide-react';
import type { SMSOptOut, SMSTemplate, SMSConfiguration } from '@/types/sms';

interface SMSComplianceProps {
  configuration?: SMSConfiguration | null;
  templates?: SMSTemplate[];
  onOptOutManagement?: () => void;
}

export default function SMSCompliance({
  configuration,
  templates = [],
  onOptOutManagement,
}: SMSComplianceProps) {
  const [optOuts, setOptOuts] = useState<SMSOptOut[]>([]);
  const [complianceScore, setComplianceScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate compliance score
  useEffect(() => {
    calculateComplianceScore();
  }, [configuration, templates]);

  const calculateComplianceScore = () => {
    let score = 0;
    let maxScore = 0;

    // Configuration compliance (30 points)
    maxScore += 30;
    if (configuration) {
      if (configuration.auto_opt_out) score += 10;
      if (
        configuration.opt_out_keywords &&
        configuration.opt_out_keywords.length > 0
      )
        score += 10;
      if (configuration.webhook_url || configuration.status_callback_url)
        score += 10;
    }

    // Template compliance (50 points)
    maxScore += 50;
    if (templates.length > 0) {
      const compliantTemplates = templates.filter(
        (t) => t.tcpa_compliant,
      ).length;
      const optOutTemplates = templates.filter(
        (t) => t.opt_out_required,
      ).length;

      // Proportional scoring
      score += (compliantTemplates / templates.length) * 30;
      score += (optOutTemplates / templates.length) * 20;
    }

    // Best practices (20 points)
    maxScore += 20;
    if (configuration?.monthly_limit && configuration.monthly_limit <= 10000)
      score += 10;
    if (configuration?.cost_per_message && configuration.cost_per_message > 0)
      score += 10;

    setComplianceScore(maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);
  };

  const loadOptOuts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sms/opt-outs');
      if (response.ok) {
        const data = await response.json();
        setOptOuts(data.optOuts || []);
      }
    } catch (error) {
      console.error('Failed to load opt-outs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOptOuts();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-warning-600';
    return 'text-error-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-success-500';
    if (score >= 70) return 'bg-warning-500';
    return 'bg-error-500';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              SMS Compliance Dashboard
            </h2>
            <p className="text-sm text-gray-500">
              TCPA compliance monitoring and opt-out management
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score */}
        <div className="lg:col-span-1">
          <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg
                className="w-24 h-24 transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - complianceScore / 100)}`}
                  className={getScoreColor(complianceScore).replace(
                    'text-',
                    'text-',
                  )}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-2xl font-bold ${getScoreColor(complianceScore)}`}
                >
                  {complianceScore}%
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Compliance Score
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {complianceScore >= 90
                ? 'Excellent'
                : complianceScore >= 70
                  ? 'Good'
                  : 'Needs Improvement'}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {templates.filter((t) => t.tcpa_compliant).length}
                  </p>
                  <p className="text-sm text-gray-500">Compliant Templates</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {optOuts.filter((o) => o.is_active).length}
                  </p>
                  <p className="text-sm text-gray-500">Active Opt-outs</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {configuration?.monthly_usage || 0}
                  </p>
                  <p className="text-sm text-gray-500">Messages This Month</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {templates.filter((t) => !t.tcpa_compliant).length}
                  </p>
                  <p className="text-sm text-gray-500">Need Review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          TCPA Compliance Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Configuration Requirements */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 mb-3">
              Configuration Requirements
            </h4>

            <div className="flex items-center gap-3">
              {configuration?.auto_opt_out ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Automatic opt-out processing enabled
              </span>
            </div>

            <div className="flex items-center gap-3">
              {configuration?.opt_out_keywords &&
              configuration.opt_out_keywords.length > 0 ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Opt-out keywords configured
              </span>
            </div>

            <div className="flex items-center gap-3">
              {configuration?.webhook_url ||
              configuration?.status_callback_url ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Delivery status tracking enabled
              </span>
            </div>

            <div className="flex items-center gap-3">
              {configuration?.monthly_limit &&
              configuration.monthly_limit <= 10000 ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Reasonable monthly limits set
              </span>
            </div>
          </div>

          {/* Template Requirements */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 mb-3">
              Template Requirements
            </h4>

            <div className="flex items-center gap-3">
              {templates.length > 0 &&
              templates.every((t) => t.opt_out_required) ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                All templates include opt-out language
              </span>
            </div>

            <div className="flex items-center gap-3">
              {templates.filter((t) => t.tcpa_compliant).length >=
              templates.length * 0.8 ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Majority of templates TCPA compliant
              </span>
            </div>

            <div className="flex items-center gap-3">
              {templates.length > 0 &&
              templates.every((t) => t.consent_required) ? (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Consent required for all templates
              </span>
            </div>

            <div className="flex items-center gap-3">
              {templates.some((t) => t.category === 'custom') ? (
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-700">
                Using approved template categories
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Scale className="w-5 h-5" />
          TCPA Compliance Guidelines
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
          <div>
            <h4 className="font-semibold mb-2">Required Elements:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Clear opt-out instructions in every message</li>
              <li>Honor opt-out requests immediately</li>
              <li>Obtain prior express written consent</li>
              <li>Identify your business in messages</li>
              <li>Send only during reasonable hours (8am-9pm)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Best Practices:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Keep detailed consent records</li>
              <li>Use double opt-in when possible</li>
              <li>Limit message frequency</li>
              <li>Provide value in every message</li>
              <li>Regular compliance audits</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Legal Disclaimer:</strong> This tool provides guidance but
            does not constitute legal advice. Consult with a qualified attorney
            for specific TCPA compliance questions. TCPA violations can result
            in fines of $500-$1,500 per message.
          </p>
        </div>
      </div>

      {/* Recent Opt-outs */}
      {optOuts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Opt-outs
            </h3>
            {onOptOutManagement && (
              <button
                onClick={onOptOutManagement}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Manage All Opt-outs →
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="space-y-2">
              {optOuts.slice(0, 5).map((optOut) => (
                <div
                  key={optOut.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <span className="font-mono text-sm text-gray-900">
                      {optOut.phone_number}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      via {optOut.opt_out_method}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(optOut.opted_out_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>

            {optOuts.length > 5 && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                And {optOuts.length - 5} more opt-outs...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() =>
            window.open(
              'https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts',
              '_blank',
            )
          }
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <Scale className="w-4 h-4 mr-2" />
          View TCPA Guidelines
        </button>

        <button
          onClick={loadOptOuts}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
        >
          <Shield className="w-4 h-4 mr-2" />
          {isLoading ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>
    </div>
  );
}
