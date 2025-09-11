import React, { useState } from 'react';
import {
  Shield,
  Star,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface SupplierVerification {
  supplierId: string;
  supplierName: string;
  verificationLevel: 'unverified' | 'basic' | 'gold' | 'premium';
  trustScore: number;
  verifiedCategories: {
    business_license: boolean;
    insurance: boolean;
    professional_certification: boolean;
    review_authenticity: boolean;
    portfolio_verification: boolean;
  };
  verificationDates: {
    business_license?: string;
    insurance?: string;
    professional_certification?: string;
    review_authenticity?: string;
    portfolio_verification?: string;
  };
  riskFactors: string[];
  trustFactors: string[];
}

interface TrustIndicatorProps {
  supplierVerification: SupplierVerification;
  showDetailed?: boolean;
  onVerificationClick?: (details: any) => void;
  layout?: 'compact' | 'full';
}

const getTrustScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getTrustScoreBgColor = (score: number) => {
  if (score >= 90) return 'bg-green-100';
  if (score >= 75) return 'bg-green-50';
  if (score >= 60) return 'bg-yellow-50';
  if (score >= 40) return 'bg-orange-50';
  return 'bg-red-50';
};

const getVerificationLevelInfo = (level: string) => {
  switch (level) {
    case 'premium':
      return {
        label: 'Premium Verified',
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
        description: 'Complete verification with all credentials validated',
        trustMessage:
          'Highest level of verification - fully vetted professional',
      };
    case 'gold':
      return {
        label: 'Gold Verified',
        icon: Shield,
        color: 'text-yellow-600',
        bgColor: 'bg-gradient-to-r from-yellow-400 to-orange-400',
        description: 'High-level verification with multiple credentials',
        trustMessage: 'Well-verified professional with strong credentials',
      };
    case 'basic':
      return {
        label: 'Basic Verified',
        icon: CheckCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        description: 'Essential business credentials verified',
        trustMessage: 'Basic verification complete - legitimate business',
      };
    default:
      return {
        label: 'Unverified',
        icon: AlertTriangle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-400',
        description: 'No verification completed',
        trustMessage: 'Proceed with extra caution - no verification on file',
      };
  }
};

const getTrustMessage = (score: number, level: string) => {
  if (level === 'unverified') {
    return {
      message: 'Unverified supplier - exercise caution',
      recommendation: 'Ask for proof of insurance and licensing before booking',
      icon: AlertTriangle,
      color: 'text-red-600',
    };
  }

  if (score >= 90) {
    return {
      message: 'Exceptional trust rating - highly recommended',
      recommendation: 'This supplier meets the highest verification standards',
      icon: CheckCircle,
      color: 'text-green-600',
    };
  }

  if (score >= 75) {
    return {
      message: 'High trust rating - recommended',
      recommendation: 'Well-verified supplier with good credentials',
      icon: CheckCircle,
      color: 'text-green-500',
    };
  }

  if (score >= 60) {
    return {
      message: 'Good trust rating - generally reliable',
      recommendation: 'Decent verification level, consider additional research',
      icon: Info,
      color: 'text-yellow-600',
    };
  }

  return {
    message: 'Limited trust information available',
    recommendation: 'Request additional verification before booking',
    icon: AlertTriangle,
    color: 'text-orange-600',
  };
};

export function TrustIndicator({
  supplierVerification,
  showDetailed = false,
  onVerificationClick,
  layout = 'compact',
}: TrustIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const levelInfo = getVerificationLevelInfo(
    supplierVerification.verificationLevel,
  );
  const trustMessage = getTrustMessage(
    supplierVerification.trustScore,
    supplierVerification.verificationLevel,
  );
  const verifiedCount = Object.values(
    supplierVerification.verifiedCategories,
  ).filter(Boolean).length;
  const LevelIcon = levelInfo.icon;
  const TrustIcon = trustMessage.icon;

  if (layout === 'compact') {
    return (
      <div className="inline-flex items-center gap-2">
        {/* Trust Score Badge */}
        <div
          className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium
          ${getTrustScoreBgColor(supplierVerification.trustScore)}
          ${getTrustScoreColor(supplierVerification.trustScore)}
        `}
        >
          <TrustIcon className="w-4 h-4" />
          <span>{supplierVerification.trustScore}/100</span>
        </div>

        {/* Verification Level */}
        {supplierVerification.verificationLevel !== 'unverified' && (
          <div
            className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm font-medium
            ${levelInfo.bgColor}
          `}
          >
            <LevelIcon className="w-4 h-4" />
            <span>{levelInfo.label}</span>
          </div>
        )}

        {/* Verification Count */}
        <span className="text-sm text-gray-600">
          {verifiedCount}/5 verified
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
            p-2 rounded-full text-white
            ${levelInfo.bgColor}
          `}
          >
            <LevelIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Trust & Verification
            </h3>
            <p className="text-sm text-gray-600">{levelInfo.description}</p>
          </div>
        </div>

        {/* Trust Score */}
        <div className="text-center">
          <div
            className={`
            text-2xl font-bold
            ${getTrustScoreColor(supplierVerification.trustScore)}
          `}
          >
            {supplierVerification.trustScore}
          </div>
          <div className="text-sm text-gray-600">Trust Score</div>
        </div>
      </div>

      {/* Trust Message */}
      <div
        className={`
        flex items-start gap-3 p-3 rounded-lg
        ${
          trustMessage.color.includes('green')
            ? 'bg-green-50'
            : trustMessage.color.includes('yellow')
              ? 'bg-yellow-50'
              : trustMessage.color.includes('orange')
                ? 'bg-orange-50'
                : 'bg-red-50'
        }
      `}
      >
        <TrustIcon className={`w-5 h-5 ${trustMessage.color} mt-0.5`} />
        <div>
          <p className={`font-medium ${trustMessage.color}`}>
            {trustMessage.message}
          </p>
          <p
            className={`text-sm ${trustMessage.color.replace('600', '700')} mt-1`}
          >
            {trustMessage.recommendation}
          </p>
        </div>
      </div>

      {/* Verification Status Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(supplierVerification.verifiedCategories).map(
          ([category, verified]) => {
            const categoryNames = {
              business_license: 'Business License',
              insurance: 'Insurance',
              professional_certification: 'Certification',
              review_authenticity: 'Verified Reviews',
              portfolio_verification: 'Portfolio',
            };

            const verificationDate =
              supplierVerification.verificationDates[
                category as keyof typeof supplierVerification.verificationDates
              ];

            return (
              <div
                key={category}
                className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                ${verified ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}
              `}
                onClick={() =>
                  onVerificationClick &&
                  onVerificationClick({
                    category,
                    verified,
                    date: verificationDate,
                  })
                }
              >
                {verified ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${verified ? 'text-green-900' : 'text-gray-600'}`}
                  >
                    {categoryNames[category as keyof typeof categoryNames]}
                  </p>
                  {verified && verificationDate && (
                    <p className="text-xs text-green-700">
                      {new Date(verificationDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Detailed Information Toggle */}
      {showDetailed && (
        <div className="space-y-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full p-2 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">
              Detailed Trust Analysis
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
              {/* Trust Factors */}
              {supplierVerification.trustFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-900 mb-2">
                    ✅ Trust Factors
                  </h4>
                  <ul className="space-y-1">
                    {supplierVerification.trustFactors.map((factor, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-green-800"
                      >
                        <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {supplierVerification.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-900 mb-2">
                    ⚠️ Consider These Factors
                  </h4>
                  <ul className="space-y-1">
                    {supplierVerification.riskFactors.map((factor, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-red-800"
                      >
                        <AlertTriangle className="w-3 h-3 text-red-600 mt-1 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Verification Progress */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Verification Progress
                </h4>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                    style={{ width: `${(verifiedCount / 5) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {verifiedCount} of 5 verifications complete (
                  {Math.round((verifiedCount / 5) * 100)}%)
                </p>
              </div>

              {/* Next Steps */}
              {supplierVerification.verificationLevel === 'unverified' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-medium text-yellow-900 mb-1">
                    💡 Booking Recommendations
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Request to see their business license</li>
                    <li>• Ask for proof of insurance coverage</li>
                    <li>• Check references from recent clients</li>
                    <li>• Consider meeting in person before booking</li>
                  </ul>
                </div>
              )}

              {supplierVerification.verificationLevel !== 'unverified' &&
                verifiedCount < 5 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-1">
                      📈 Could Improve With
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {!supplierVerification.verifiedCategories.insurance && (
                        <li>• Insurance verification for added protection</li>
                      )}
                      {!supplierVerification.verifiedCategories
                        .professional_certification && (
                        <li>• Professional certification validation</li>
                      )}
                      {!supplierVerification.verifiedCategories
                        .portfolio_verification && (
                        <li>• Portfolio authenticity verification</li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Trust score calculated from verification status, reviews, and business
          credentials
        </p>
      </div>
    </div>
  );
}

export default TrustIndicator;
