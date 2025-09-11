'use client';

import { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button-untitled';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Share2,
  QrCode,
  Twitter,
  Facebook,
  Linkedin,
  Check,
  ExternalLink,
  Users,
  Gift,
  Zap,
  Download,
  X,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dynamic import for QR code component (client-side only)
const QRCodeDisplay = dynamic(
  () =>
    import('./QRCodeDisplay').then((mod) => ({ default: mod.QRCodeDisplay })),
  {
    ssr: false,
    loading: () => (
      <div className="w-32 h-32 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center animate-pulse">
        <QrCode className="h-8 w-8 text-gray-400" />
      </div>
    ),
  },
);

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingRewards: number;
  totalEarned: number;
  conversionRate: number;
}

interface SocialPlatform {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  shareUrl: (url: string, text: string) => string;
}

interface ReferralWidgetProps {
  referralCode: string;
  referralUrl: string;
  stats?: ReferralStats;
  className?: string;
  onCodeCopy?: () => void;
  onShare?: (platform: string) => void;
  onQRCodeGenerate?: () => void;
  onQRCodeDownload?: (dataUrl: string) => void;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: 'Twitter',
    icon: Twitter,
    color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
    shareUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
    shareUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200',
    shareUrl: (url: string, text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    name: 'Email',
    icon: Mail,
    color: 'hover:bg-green-50 hover:text-green-700 hover:border-green-200',
    shareUrl: (url: string, text: string) =>
      `mailto:?subject=${encodeURIComponent('Join me on WedSync!')}&body=${encodeURIComponent(text + ' ' + url)}`,
  },
];

const defaultStats: ReferralStats = {
  totalReferrals: 0,
  activeReferrals: 0,
  pendingRewards: 0,
  totalEarned: 0,
  conversionRate: 0,
};

export function ReferralWidget({
  referralCode,
  referralUrl,
  stats = defaultStats,
  className,
  onCodeCopy,
  onShare,
  onQRCodeGenerate,
  onQRCodeDownload,
}: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQRDataUrl] = useState<string>('');

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      onCodeCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy referral code:', error);
      toast.error('Failed to copy. Please try again.');
    }
  }, [referralCode, onCodeCopy]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setUrlCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy referral URL:', error);
      toast.error('Failed to copy link. Please try again.');
    }
  }, [referralUrl]);

  const handleSocialShare = useCallback(
    (platform: SocialPlatform) => {
      const shareText = `Join me on WedSync - the ultimate wedding planning platform! Use my referral code: ${referralCode}`;
      const shareUrl = platform.shareUrl(referralUrl, shareText);

      if (platform.name === 'Email') {
        window.location.href = shareUrl;
      } else {
        window.open(
          shareUrl,
          '_blank',
          'width=600,height=400,scrollbars=yes,resizable=yes',
        );
      }

      onShare?.(platform.name);
      toast.success(`Shared on ${platform.name}!`);

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'share', {
          method: platform.name.toLowerCase(),
          content_type: 'referral_code',
          content_id: referralCode,
        });
      }
    },
    [referralCode, referralUrl, onShare],
  );

  const handleQRGenerate = useCallback(() => {
    setShowQR(!showQR);
    onQRCodeGenerate?.();
  }, [showQR, onQRCodeGenerate]);

  const handleQRGenerated = useCallback((dataUrl: string) => {
    setQRDataUrl(dataUrl);
  }, []);

  const handleQRDownload = useCallback(() => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.download = `wedsync-referral-${referralCode}.png`;
      link.href = qrDataUrl;
      link.click();
      onQRCodeDownload?.(qrDataUrl);
      toast.success('QR code downloaded!');
    }
  }, [qrDataUrl, referralCode, onQRCodeDownload]);

  return (
    <Card
      className={cn(
        'w-full max-w-md mx-auto bg-white border border-gray-200 shadow-xs hover:shadow-sm transition-shadow duration-200',
        className,
      )}
      data-testid="referral-widget"
      role="region"
      aria-label="Referral Program"
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary-600" />
              Share & Earn
            </CardTitle>
            <p className="text-sm text-gray-600">
              Share your referral code and earn rewards for every successful
              referral
            </p>
          </div>
          {showQR && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQR(false)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              aria-label="Hide QR Code"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Referral Code Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="referral-code"
              className="text-sm font-medium text-gray-700"
            >
              Your Referral Code
            </label>
            <Badge
              variant="secondary"
              className="text-xs bg-green-50 text-green-700 border-green-200"
            >
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div
              id="referral-code"
              data-testid="referral-code"
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-900 tracking-wide select-all"
            >
              {referralCode}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyCode}
              className="px-3 py-2.5 border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              data-testid="copy-code-button"
              aria-label="Copy referral code"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-gray-200" />

        {/* Social Sharing Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Share on Social</h4>
          <div
            className="grid grid-cols-2 gap-2"
            data-testid="social-share-buttons"
          >
            {socialPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <Button
                  key={platform.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSocialShare(platform)}
                  className={cn(
                    'flex items-center justify-center gap-2 h-auto py-3 border-gray-200 transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    platform.color,
                  )}
                  data-testid={`share-${platform.name.toLowerCase()}`}
                  aria-label={`Share on ${platform.name}`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs font-medium">{platform.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="justify-center border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            data-testid="copy-link-button"
          >
            {urlCopied ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {urlCopied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleQRGenerate}
            className="justify-center border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            data-testid={showQR ? 'hide-qr-button' : 'show-qr-button'}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showQR ? 'Hide QR' : 'QR Code'}
          </Button>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Suspense
              fallback={
                <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center animate-pulse">
                  <QrCode className="h-8 w-8 text-gray-400" />
                </div>
              }
            >
              <QRCodeDisplay
                value={referralUrl}
                size={128}
                onGenerated={handleQRGenerated}
                className="border-2 border-white rounded-lg shadow-sm"
                data-testid="qr-code-image"
              />
            </Suspense>

            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-600 text-center">
                Scan to access your referral link
              </p>
              {qrDataUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQRDownload}
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
        )}

        <Separator className="bg-gray-200" />

        {/* Stats Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Your Stats</h4>
          <div className="grid grid-cols-2 gap-3" data-testid="referral-stats">
            <div className="text-center p-3 bg-primary-50 rounded-lg border border-primary-100">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-primary-600" />
              </div>
              <div className="text-lg font-semibold text-primary-900">
                {stats.totalReferrals}
              </div>
              <div className="text-xs text-primary-700 font-medium">
                Total Referrals
              </div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-center mb-1">
                <Gift className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-semibold text-green-900">
                ${stats.totalEarned}
              </div>
              <div className="text-xs text-green-700 font-medium">
                Total Earned
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active:</span>
              <Badge
                variant="outline"
                className="text-xs font-medium border-gray-200"
              >
                {stats.activeReferrals}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending:</span>
              <Badge
                variant="outline"
                className="text-xs font-medium border-amber-200 text-amber-700 bg-amber-50"
              >
                ${stats.pendingRewards}
              </Badge>
            </div>
          </div>

          {stats.conversionRate > 0 && (
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 bg-amber-50 p-2 rounded border border-amber-100">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                {stats.conversionRate}% conversion rate
              </span>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <Button
          className="w-full bg-primary-600 hover:bg-primary-700 focus:bg-primary-700 text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          size="default"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Now & Start Earning
        </Button>
      </CardContent>
    </Card>
  );
}

export type { ReferralWidgetProps, ReferralStats, SocialPlatform };
