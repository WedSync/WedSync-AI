'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Share,
  MessageCircle,
  MessageSquare,
  Mail,
  Copy,
  Smartphone,
  Monitor,
  Tablet,
  Apple,
  Chrome,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CrossPlatformShareProps {
  referralData: {
    link: string;
    code: string;
    supplierName: string;
    customMessage?: string;
  };
  onShareComplete?: (method: string, success: boolean) => void;
}

interface ShareMethod {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  primary?: boolean;
  color?: string;
  platforms: Array<'ios' | 'android' | 'desktop'>;
}

interface PlatformInfo {
  platform: 'ios' | 'android' | 'desktop';
  browser: string;
  canShare: boolean;
  supportsClipboard: boolean;
  supportsVibration: boolean;
}

// Platform detection hook
const usePlatformDetection = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        platform: 'desktop',
        browser: 'unknown',
        canShare: false,
        supportsClipboard: false,
        supportsVibration: false,
      };
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid;

    return {
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
      browser: getBrowserName(userAgent),
      canShare: 'share' in navigator,
      supportsClipboard: 'clipboard' in navigator,
      supportsVibration: 'vibrate' in navigator,
    };
  });

  return platformInfo;
};

const getBrowserName = (userAgent: string): string => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
    return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

// Touch-optimized button with platform-specific styling
const TouchOptimizedButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    platform?: 'ios' | 'android' | 'desktop';
  }
>(({ className, platform = 'desktop', onClick, ...props }, ref) => {
  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Platform-specific haptic feedback
      if (platform === 'ios' && 'vibrate' in navigator) {
        // iOS-style light haptic
        navigator.vibrate(50);
      } else if (platform === 'android' && 'vibrate' in navigator) {
        // Android-style stronger haptic
        navigator.vibrate([50, 10, 50]);
      }

      onClick?.(e);
    },
    [onClick, platform],
  );

  const platformStyles = {
    ios: 'rounded-2xl shadow-sm active:scale-95',
    android: 'rounded-xl shadow-md active:scale-98',
    desktop: 'rounded-lg shadow-sm hover:shadow-md',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'touch-manipulation transition-all duration-150',
        platformStyles[platform],
        className,
      )}
      style={{ touchAction: 'manipulation' }}
      onClick={handleClick}
      {...props}
    />
  );
});
TouchOptimizedButton.displayName = 'TouchOptimizedButton';

export const CrossPlatformShare: React.FC<CrossPlatformShareProps> = ({
  referralData,
  onShareComplete,
}) => {
  const { platform, browser, canShare, supportsClipboard, supportsVibration } =
    usePlatformDetection();
  const [shareMethod, setShareMethod] = useState<string>('native');
  const [isSharing, setIsSharing] = useState(false);

  // Wedding-specific share message
  const shareMessage =
    referralData.customMessage ||
    `💍 Discover ${referralData.supplierName} for your wedding! They've been incredible to work with. Join WedSync and connect with amazing wedding suppliers!\n\n${referralData.link}`;

  // Platform-specific share options
  const shareOptions = useMemo(() => {
    const base: ShareMethod[] = [
      {
        id: 'native',
        label: 'Share',
        icon: Share,
        available: canShare,
        primary: true,
        platforms: ['ios', 'android', 'desktop'],
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: MessageCircle,
        available: true,
        color: '#25D366',
        platforms: ['ios', 'android', 'desktop'],
      },
      {
        id: 'sms',
        label: 'SMS',
        icon: MessageSquare,
        available: platform !== 'desktop',
        color: '#007AFF',
        platforms: ['ios', 'android'],
      },
      {
        id: 'email',
        label: 'Email',
        icon: Mail,
        available: true,
        color: '#EA4335',
        platforms: ['ios', 'android', 'desktop'],
      },
    ];

    // Add platform-specific options
    if (platform === 'ios') {
      base.push({
        id: 'imessage',
        label: 'iMessage',
        icon: MessageCircle,
        available: true,
        color: '#007AFF',
        platforms: ['ios'],
      });
    }

    return base.filter(
      (option) => option.available && option.platforms.includes(platform),
    );
  }, [platform, canShare]);

  // Handle different sharing methods
  const handleShare = useCallback(
    async (shareId: string) => {
      setIsSharing(true);
      let success = false;

      try {
        switch (shareId) {
          case 'native':
            if (canShare) {
              await navigator.share({
                title: `${referralData.supplierName} - Wedding Supplier`,
                text: shareMessage,
                url: referralData.link,
              });
              success = true;
            } else {
              await handleCopyToClipboard();
              success = true;
            }
            break;

          case 'whatsapp':
            success = await handleWhatsAppShare();
            break;

          case 'sms':
            success = await handleSMSShare();
            break;

          case 'email':
            success = await handleEmailShare();
            break;

          case 'imessage':
            success = await handleiMessageShare();
            break;

          default:
            await handleCopyToClipboard();
            success = true;
        }

        if (success) {
          toast.success(
            `Shared via ${shareOptions.find((opt) => opt.id === shareId)?.label}! 🎉`,
          );
        }
      } catch (error) {
        console.error(`${shareId} share failed:`, error);
        toast.error('Share failed. Link copied to clipboard instead.');
        await handleCopyToClipboard();
      } finally {
        setIsSharing(false);
        onShareComplete?.(shareId, success);
      }
    },
    [shareMessage, referralData, canShare, shareOptions, onShareComplete],
  );

  const handleCopyToClipboard = async (): Promise<boolean> => {
    try {
      if (supportsClipboard) {
        await navigator.clipboard.writeText(shareMessage);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareMessage;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  };

  const handleWhatsAppShare = async (): Promise<boolean> => {
    const whatsappText = encodeURIComponent(shareMessage);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

    window.open(whatsappUrl, '_blank');
    return true;
  };

  const handleSMSShare = async (): Promise<boolean> => {
    const smsText = encodeURIComponent(shareMessage.substring(0, 160));
    let smsUrl: string;

    if (platform === 'ios') {
      smsUrl = `sms:&body=${smsText}`;
    } else {
      smsUrl = `sms:?body=${smsText}`;
    }

    window.open(smsUrl, '_blank');
    return true;
  };

  const handleEmailShare = async (): Promise<boolean> => {
    const subject = encodeURIComponent(
      `Wedding Vendor Recommendation - ${referralData.supplierName}`,
    );
    const body = encodeURIComponent(shareMessage);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;

    window.open(emailUrl, '_blank');
    return true;
  };

  const handleiMessageShare = async (): Promise<boolean> => {
    // iOS-specific iMessage URL scheme
    const messageText = encodeURIComponent(shareMessage);
    const imessageUrl = `sms:&body=${messageText}`;

    window.open(imessageUrl, '_blank');
    return true;
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return Apple;
      case 'android':
        return Chrome;
      default:
        return Monitor;
    }
  };

  return (
    <div className="cross-platform-share bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Platform Info Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {React.createElement(getPlatformIcon(), { className: 'w-5 h-5' })}
            <h3 className="font-semibold">
              Share on{' '}
              {platform === 'ios'
                ? 'iOS'
                : platform === 'android'
                  ? 'Android'
                  : 'Desktop'}
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="bg-white/20 text-white border-white/30"
          >
            {browser}
          </Badge>
        </div>
      </div>

      {/* Share Options */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map((option) => (
            <TouchOptimizedButton
              key={option.id}
              platform={platform}
              onClick={() => handleShare(option.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 text-white font-medium transition-colors min-h-[88px] justify-center',
                option.primary
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  : 'bg-gray-600 hover:bg-gray-700',
                isSharing && 'opacity-50 pointer-events-none',
              )}
              style={{
                backgroundColor:
                  !option.primary && option.color ? option.color : undefined,
                minHeight: platform === 'desktop' ? '80px' : '88px',
                minWidth: platform === 'desktop' ? '120px' : '100%',
              }}
              disabled={isSharing}
            >
              <option.icon className="w-6 h-6" />
              <span className="text-sm text-center">{option.label}</span>
              {option.primary && (
                <span className="text-xs opacity-75">Recommended</span>
              )}
            </TouchOptimizedButton>
          ))}
        </div>

        {/* Platform Capabilities */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Platform Features
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div
              className={cn(
                'flex items-center gap-2',
                canShare ? 'text-green-600' : 'text-gray-400',
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  canShare ? 'bg-green-500' : 'bg-gray-300',
                )}
              />
              Native Sharing
            </div>
            <div
              className={cn(
                'flex items-center gap-2',
                supportsClipboard ? 'text-green-600' : 'text-gray-400',
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  supportsClipboard ? 'bg-green-500' : 'bg-gray-300',
                )}
              />
              Clipboard Access
            </div>
            <div
              className={cn(
                'flex items-center gap-2',
                supportsVibration ? 'text-green-600' : 'text-gray-400',
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  supportsVibration ? 'bg-green-500' : 'bg-gray-300',
                )}
              />
              Haptic Feedback
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Touch Optimized
            </div>
          </div>
        </div>

        {/* Fallback Copy Section */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Copy className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-blue-900 mb-1">Quick Copy</h5>
              <p className="text-sm text-blue-700 mb-3">
                Copy link and share manually if other methods don't work
              </p>
              <TouchOptimizedButton
                platform={platform}
                onClick={() => handleShare('copy')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-medium"
                disabled={isSharing}
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </div>
              </TouchOptimizedButton>
            </div>
          </div>
        </Card>

        {/* Platform-Specific Tips */}
        {platform === 'ios' && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Apple className="w-4 h-4" />
              iOS Tips
            </h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use "Share" for native iOS sharing experience</li>
              <li>• iMessage works great for sharing with iPhone users</li>
              <li>• Links preview beautifully in Messages and Mail</li>
            </ul>
          </div>
        )}

        {platform === 'android' && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Chrome className="w-4 h-4" />
              Android Tips
            </h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Share directly to any installed app</li>
              <li>• WhatsApp is the most popular choice for weddings</li>
              <li>• SMS works with all messaging apps</li>
            </ul>
          </div>
        )}

        {/* Wedding Context */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4" />
            <span>Perfect for venue sharing</span>
          </div>
          <p className="text-xs text-gray-500">
            Optimized for wedding professionals on the go
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrossPlatformShare;
