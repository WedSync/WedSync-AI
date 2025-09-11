import React, { useState } from 'react';
import { Shield, CheckCircle, Crown, Award, Camera } from 'lucide-react';

export type VerificationLevel = 'basic' | 'gold' | 'premium' | 'unverified';

export interface VerificationStatus {
  level: VerificationLevel;
  categories: {
    business_license: boolean;
    insurance: boolean;
    professional_certification: boolean;
    review_authenticity: boolean;
    portfolio_verification: boolean;
  };
  verifiedAt?: string;
  expiresAt?: string;
  trustScore: number;
}

interface VerificationBadgesProps {
  verificationStatus: VerificationStatus;
  showTooltips?: boolean;
  badgeSize?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  onBadgeClick?: (type: string) => void;
}

const getBadgeConfig = (type: string) => {
  const configs = {
    business_license: {
      icon: Shield,
      label: 'Licensed Business',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Verified business registration and licensing',
    },
    insurance: {
      icon: Shield,
      label: 'Insured Professional',
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Current liability and professional insurance coverage',
    },
    professional_certification: {
      icon: Award,
      label: 'Certified Professional',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Industry certifications and professional qualifications',
    },
    review_authenticity: {
      icon: CheckCircle,
      label: 'Verified Reviews',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      description: 'Authentic customer reviews and ratings verified',
    },
    portfolio_verification: {
      icon: Camera,
      label: 'Verified Portfolio',
      color: 'bg-pink-100 text-pink-800 border-pink-200',
      description: 'Authentic work samples and portfolio ownership confirmed',
    },
  };

  return configs[type as keyof typeof configs];
};

const getVerificationLevelBadge = (level: VerificationLevel) => {
  switch (level) {
    case 'premium':
      return {
        icon: Crown,
        label: 'Premium Verified',
        color: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
        description: 'Complete verification with all credentials validated',
      };
    case 'gold':
      return {
        icon: Shield,
        label: 'Gold Verified',
        color: 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-white',
        description: 'High-level verification with multiple credentials',
      };
    case 'basic':
      return {
        icon: CheckCircle,
        label: 'Basic Verified',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        description: 'Essential business credentials verified',
      };
    default:
      return null;
  }
};

export function VerificationBadges({
  verificationStatus,
  showTooltips = true,
  badgeSize = 'medium',
  clickable = false,
  onBadgeClick,
}: VerificationBadgesProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base',
  };

  const iconSizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const activeBadges = Object.entries(verificationStatus.categories)
    .filter(([_, verified]) => verified)
    .map(([type, _]) => type);

  const levelBadge = getVerificationLevelBadge(verificationStatus.level);

  if (verificationStatus.level === 'unverified') {
    return (
      <div className="inline-flex items-center">
        <span className="text-sm text-gray-500">No verification badges</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Main Level Badge */}
      {levelBadge && (
        <div className="relative">
          <div
            className={`
              inline-flex items-center gap-1.5 rounded-full border
              ${levelBadge.color} ${sizeClasses[badgeSize]}
              ${clickable ? 'cursor-pointer hover:shadow-md transition-all' : ''}
            `}
            onMouseEnter={() => showTooltips && setHoveredBadge('level')}
            onMouseLeave={() => setHoveredBadge(null)}
            onClick={() => clickable && onBadgeClick?.('level')}
          >
            <levelBadge.icon className={iconSizeClasses[badgeSize]} />
            <span className="font-semibold">{levelBadge.label}</span>
          </div>

          {/* Tooltip */}
          {showTooltips && hoveredBadge === 'level' && (
            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
                <p className="font-semibold">{levelBadge.label}</p>
                <p className="text-gray-300 mt-1">{levelBadge.description}</p>
                <div className="mt-2 text-xs text-gray-400">
                  Trust Score: {verificationStatus.trustScore}/100
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Individual Verification Badges */}
      {activeBadges.map((badgeType) => {
        const config = getBadgeConfig(badgeType);
        if (!config) return null;

        return (
          <div key={badgeType} className="relative">
            <div
              className={`
                inline-flex items-center gap-1 rounded-full border
                ${config.color} ${sizeClasses[badgeSize]}
                ${clickable ? 'cursor-pointer hover:shadow-md transition-all' : ''}
              `}
              onMouseEnter={() => showTooltips && setHoveredBadge(badgeType)}
              onMouseLeave={() => setHoveredBadge(null)}
              onClick={() => clickable && onBadgeClick?.(badgeType)}
            >
              <config.icon className={iconSizeClasses[badgeSize]} />
              <span className="font-medium">{config.label}</span>
            </div>

            {/* Tooltip */}
            {showTooltips && hoveredBadge === badgeType && (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
                  <p className="font-semibold">{config.label}</p>
                  <p className="text-gray-300 mt-1">{config.description}</p>
                  {verificationStatus.verifiedAt && (
                    <div className="mt-2 text-xs text-gray-400">
                      Verified:{' '}
                      {new Date(
                        verificationStatus.verifiedAt,
                      ).toLocaleDateString()}
                    </div>
                  )}
                  {verificationStatus.expiresAt && (
                    <div className="text-xs text-gray-400">
                      Expires:{' '}
                      {new Date(
                        verificationStatus.expiresAt,
                      ).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Trust Score Indicator */}
      {verificationStatus.trustScore > 0 && (
        <div className="ml-2">
          <div className="text-xs font-medium text-gray-600">
            Trust Score:{' '}
            <span className="text-green-600">
              {verificationStatus.trustScore}/100
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationBadges;
