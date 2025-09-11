'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangleIcon,
  ClockIcon,
  ArrowUpIcon,
  RefreshCwIcon,
  HeartIcon,
  ZapIcon,
  ShieldIcon,
  CalendarIcon,
  InfoIcon,
  CheckCircleIcon,
} from 'lucide-react';
import {
  RateViolation,
  UpgradeRecommendation,
  SubscriptionTier,
  ViolationType,
  WeddingContextType,
  isPeakWeddingSeason,
} from '@/types/rate-limiting';

interface RateLimitExceededDialogProps {
  isOpen: boolean;
  violation: RateViolation;
  upgradeRecommendation?: UpgradeRecommendation;
  onClose?: () => void;
  onUpgrade?: (tier: SubscriptionTier) => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
  showWeddingContext?: boolean;
}

export default function RateLimitExceededDialog({
  isOpen,
  violation,
  upgradeRecommendation,
  onClose,
  onUpgrade,
  onRetry,
  onContactSupport,
  showWeddingContext = true,
}: RateLimitExceededDialogProps) {
  const [countdown, setCountdown] = useState<number>(violation.retryAfter);
  const [canRetry, setCanRetry] = useState(false);

  const isWeddingSeason = isPeakWeddingSeason();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanRetry(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown]);

  const getViolationTypeMessage = (): {
    title: string;
    description: string;
    icon: React.ReactNode;
  } => {
    switch (violation.violationType) {
      case ViolationType.RATE_LIMIT_EXCEEDED:
        return {
          title: 'Rate Limit Exceeded',
          description:
            "You've made too many requests in a short time. Please wait before trying again.",
          icon: <ClockIcon className="w-6 h-6 text-orange-500" />,
        };
      case ViolationType.BURST_LIMIT_EXCEEDED:
        return {
          title: 'Burst Limit Exceeded',
          description:
            'Too many simultaneous requests detected. Please space out your requests.',
          icon: <ZapIcon className="w-6 h-6 text-red-500" />,
        };
      case ViolationType.DAILY_LIMIT_EXCEEDED:
        return {
          title: 'Daily Limit Reached',
          description:
            "You've used all your daily API requests. Upgrade for more capacity.",
          icon: <CalendarIcon className="w-6 h-6 text-blue-500" />,
        };
      case ViolationType.MONTHLY_LIMIT_EXCEEDED:
        return {
          title: 'Monthly Limit Reached',
          description:
            'Your monthly request quota is exhausted. Consider upgrading your plan.',
          icon: <AlertTriangleIcon className="w-6 h-6 text-red-500" />,
        };
      case ViolationType.SUSPICIOUS_PATTERN:
        return {
          title: 'Unusual Activity Detected',
          description:
            "We've detected unusual request patterns. Please contact support if this seems incorrect.",
          icon: <ShieldIcon className="w-6 h-6 text-purple-500" />,
        };
      case ViolationType.AUTOMATED_ABUSE:
        return {
          title: 'Automated Request Blocking',
          description:
            'Automated requests have been temporarily blocked. Please contact support.',
          icon: <ShieldIcon className="w-6 h-6 text-red-600" />,
        };
      default:
        return {
          title: 'Request Limit Exceeded',
          description:
            "Your request couldn't be completed due to rate limiting.",
          icon: <AlertTriangleIcon className="w-6 h-6 text-orange-500" />,
        };
    }
  };

  const getWeddingContextMessage = (): string | null => {
    const endpoint = violation.endpoint;

    if (endpoint.includes('wedding')) {
      return 'This affects your wedding planning features. Consider upgrading for uninterrupted access.';
    }
    if (endpoint.includes('supplier') || endpoint.includes('vendor')) {
      return 'This limits your supplier management capabilities. Upgrade to avoid disruptions.';
    }
    if (endpoint.includes('photo') || endpoint.includes('media')) {
      return 'Photo and media uploads are affected. Upgrade to continue sharing your work.';
    }
    if (endpoint.includes('booking')) {
      return 'Booking system access is limited. Upgrade to ensure smooth client bookings.';
    }

    return null;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSeverityLevel = (): 'low' | 'medium' | 'high' => {
    switch (violation.violationType) {
      case ViolationType.MONTHLY_LIMIT_EXCEEDED:
      case ViolationType.AUTOMATED_ABUSE:
        return 'high';
      case ViolationType.DAILY_LIMIT_EXCEEDED:
      case ViolationType.SUSPICIOUS_PATTERN:
        return 'medium';
      default:
        return 'low';
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
    switch (severity) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
    }
  };

  const violationInfo = getViolationTypeMessage();
  const weddingMessage = showWeddingContext ? getWeddingContextMessage() : null;
  const severity = getSeverityLevel();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md ${getSeverityColor(severity)} border-2`}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {violationInfo.icon}
            <div>
              <DialogTitle className="text-lg font-semibold">
                {violationInfo.title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Endpoint: {violation.endpoint}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main Description */}
          <p className="text-gray-700">{violationInfo.description}</p>

          {/* Wedding Context Alert */}
          {weddingMessage && (
            <Alert className="border-purple-200 bg-purple-50">
              <HeartIcon className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-700">
                {weddingMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Wedding Season Notice */}
          {isWeddingSeason && (
            <Alert className="border-orange-200 bg-orange-50">
              <ZapIcon className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                Peak wedding season traffic is high. Consider upgrading for
                priority access.
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Details */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Requests Attempted</p>
                <p className="font-bold text-lg text-red-600">
                  {violation.requestsAttempted.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Requests Allowed</p>
                <p className="font-bold text-lg text-green-600">
                  {violation.requestsAllowed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Retry Countdown */}
          {countdown > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Time until retry allowed:</span>
                <span className="font-mono">{formatTime(countdown)}</span>
              </div>
              <Progress
                value={
                  ((violation.retryAfter - countdown) / violation.retryAfter) *
                  100
                }
              />
            </div>
          )}

          {/* Can Retry Indicator */}
          {canRetry && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                You can now retry your request
              </span>
            </div>
          )}

          {/* Upgrade Recommendation */}
          {upgradeRecommendation && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpIcon className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  Recommended Solution
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3">
                {upgradeRecommendation.customMessage}
              </p>

              <div className="flex items-center justify-between text-sm mb-3">
                <span>Current: {upgradeRecommendation.currentTier}</span>
                <ArrowUpIcon className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-green-600">
                  Upgrade to {upgradeRecommendation.recommendedTier}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  • +{upgradeRecommendation.additionalRequests.toLocaleString()}{' '}
                  monthly requests
                </p>
                <p>
                  • {upgradeRecommendation.additionalFeatures.length} new
                  features
                </p>
                {upgradeRecommendation.monthlySavings && (
                  <p>• Save ${upgradeRecommendation.monthlySavings}/month</p>
                )}
                {upgradeRecommendation.weddingDeadlineImpact && (
                  <p className="text-red-600 font-medium">
                    • Critical for upcoming wedding deadline
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Actions */}
            <div className="flex gap-2">
              {canRetry && onRetry && (
                <Button onClick={onRetry} className="flex-1">
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Retry Request
                </Button>
              )}

              {upgradeRecommendation && onUpgrade && (
                <Button
                  onClick={() =>
                    onUpgrade(upgradeRecommendation.recommendedTier)
                  }
                  variant={canRetry ? 'outline' : 'default'}
                  className="flex-1"
                >
                  <ArrowUpIcon className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {onContactSupport && (
                <Button
                  variant="outline"
                  onClick={onContactSupport}
                  className="flex-1"
                >
                  Contact Support
                </Button>
              )}

              {onClose && (
                <Button variant="ghost" onClick={onClose} className="flex-1">
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <InfoIcon className="w-3 h-3" />
              <span className="font-medium">Additional Information</span>
            </div>
            <div className="space-y-1">
              <p>Request ID: {violation.id}</p>
              <p>Time: {violation.timestamp.toLocaleString()}</p>
              {violation.userAgent && (
                <p>Client: {violation.userAgent.split(' ')[0]}</p>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">
              💡 Tips to avoid rate limits:
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Space out your requests over time</li>
              <li>• Use batch operations when available</li>
              <li>• Cache frequently accessed data</li>
              <li>• Consider upgrading for higher limits</li>
              {isWeddingSeason && (
                <li>
                  • Wedding season has increased traffic - plan accordingly
                </li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
