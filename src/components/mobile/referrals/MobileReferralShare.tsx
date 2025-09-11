'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Share,
  MessageCircle,
  MessageSquare,
  Mail,
  Copy,
  Download,
  QrCode,
  Heart,
  Shield,
  Smartphone,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileReferralShareProps {
  referralLink: string;
  qrCodeUrl?: string;
  supplierName: string;
  customMessage?: string;
  vendorId: string;
  referralCode: string;
}

interface ShareMethod {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => Promise<void>;
  available: boolean;
}

interface NetworkStatus {
  isOffline: boolean;
  effectiveType?: string;
}

// Custom hook for network status
const useNetworkStatus = (): NetworkStatus => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<string | undefined>();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setEffectiveType(connection?.effectiveType);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, effectiveType };
};

// Custom hook for native share support
const useNativeShare = () => {
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported('share' in navigator);
  }, []);

  return { shareSupported };
};

// Touch-optimized button component
const TouchFriendlyButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    minTouchTarget?: string;
    hapticFeedback?: boolean;
  }
>(
  (
    {
      className,
      minTouchTarget = '48px',
      hapticFeedback = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = useCallback(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        // Haptic feedback for iOS
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }

        onClick?.(e);
      },
      [onClick, hapticFeedback],
    );

    return (
      <button
        ref={ref}
        className={cn(
          'touch-manipulation active:scale-95 transition-transform duration-150',
          className,
        )}
        style={{
          minHeight: minTouchTarget,
          minWidth: minTouchTarget,
          touchAction: 'manipulation',
        }}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
TouchFriendlyButton.displayName = 'TouchFriendlyButton';

export const MobileReferralShare: React.FC<MobileReferralShareProps> = ({
  referralLink,
  qrCodeUrl,
  supplierName,
  customMessage,
  vendorId,
  referralCode,
}) => {
  const { shareSupported } = useNativeShare();
  const { isOffline, effectiveType } = useNetworkStatus();
  const [isSharing, setIsSharing] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [showQR, setShowQR] = useState(false);

  // Wedding-specific share message
  const shareMessage =
    customMessage ||
    `✨ Check out ${supplierName} for your wedding! They've been amazing for our special day. Join WedSync and get connected! 💍\n\n${referralLink}`;

  // Handle native share with fallback
  const handleNativeShare = async () => {
    if (!shareSupported) {
      await copyToClipboard();
      return;
    }

    try {
      setIsSharing(true);

      await navigator.share({
        title: `${supplierName} - Wedding Vendor Recommendation`,
        text: shareMessage,
        url: referralLink,
      });

      // Track successful share
      await trackShare('native_share');
      setShareCount((prev) => prev + 1);

      toast.success('Shared successfully! 🎉');
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback to copy
      await copyToClipboard();
    } finally {
      setIsSharing(false);
    }
  };

  // Copy to clipboard with feedback
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareMessage}\n\n${referralLink}`);
      toast.success('Referral link copied! Ready to share 📋');
      await trackShare('clipboard');
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link');
    }
  };

  // WhatsApp sharing
  const shareViaWhatsApp = async () => {
    const whatsappText = encodeURIComponent(shareMessage);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

    try {
      window.open(whatsappUrl, '_blank');
      await trackShare('whatsapp');
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      toast.error('WhatsApp not available');
    }
  };

  // SMS sharing
  const shareViaSMS = async () => {
    const smsText = encodeURIComponent(shareMessage.substring(0, 160) + '...');
    const smsUrl = `sms:?body=${smsText}`;

    try {
      window.open(smsUrl, '_blank');
      await trackShare('sms');
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('SMS share failed:', error);
      toast.error('SMS not available');
    }
  };

  // Email sharing
  const shareViaEmail = async () => {
    const subject = encodeURIComponent(
      `Wedding Vendor Recommendation - ${supplierName}`,
    );
    const body = encodeURIComponent(shareMessage);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;

    try {
      window.open(emailUrl, '_blank');
      await trackShare('email');
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('Email share failed:', error);
      toast.error('Email not available');
    }
  };

  // Track sharing attempts
  const trackShare = async (method: string) => {
    try {
      await fetch('/api/referrals/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          referralCode,
          method,
          timestamp: new Date().toISOString(),
          platform: 'mobile',
          networkType: effectiveType || 'unknown',
        }),
      });
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  // Save QR code to photos
  const saveQRToPhotos = async () => {
    try {
      const canvas = document.querySelector(
        'canvas[data-qr-code]',
      ) as HTMLCanvasElement;
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `${supplierName}-referral-qr.png`, {
          type: 'image/png',
        });

        if ('share' in navigator) {
          await navigator.share({
            title: `${supplierName} Referral QR Code`,
            files: [file],
          });
        } else {
          // Fallback: create download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${supplierName}-referral-qr.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Failed to save QR code:', error);
      toast.error('Failed to save QR code');
    }
  };

  const shareOptions: ShareMethod[] = [
    {
      id: 'native',
      label: shareSupported ? 'Share' : 'Copy Link',
      icon: shareSupported ? Share : Copy,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: handleNativeShare,
      available: true,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      action: shareViaWhatsApp,
      available: true,
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: MessageSquare,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: shareViaSMS,
      available: 'vibrate' in navigator, // Basic mobile check
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: 'bg-red-500 hover:bg-red-600',
      action: shareViaEmail,
      available: true,
    },
  ].filter((option) => option.available);

  return (
    <div className="mobile-share-container bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-400 to-pink-600 px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <Heart className="w-5 h-5" />
          <h3 className="font-semibold text-lg">
            Share Your Wedding Portfolio
          </h3>
        </div>
        <p className="text-rose-100 text-sm mt-1">
          Help couples discover {supplierName}
        </p>
      </div>

      {/* Network Status */}
      {isOffline && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Limited Connection
            </span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            You can still share via QR code and copy your link. Other shares
            will work when connected.
          </p>
        </div>
      )}

      {/* Share Options Grid */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map((option) => (
            <TouchFriendlyButton
              key={option.id}
              onClick={option.action}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl text-white font-medium transition-colors min-h-[80px] justify-center',
                option.color,
                isSharing && 'opacity-50 pointer-events-none',
              )}
              disabled={isSharing}
              minTouchTarget="80px"
            >
              <option.icon className="w-6 h-6" />
              <span className="text-sm">{option.label}</span>
            </TouchFriendlyButton>
          ))}
        </div>

        {/* QR Code Section */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800">QR Code</span>
              <Badge variant="secondary" className="text-xs">
                Offline Ready
              </Badge>
            </div>
            <TouchFriendlyButton
              onClick={() => setShowQR(!showQR)}
              className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100"
            >
              {showQR ? 'Hide' : 'Show'}
            </TouchFriendlyButton>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col items-center gap-4"
              >
                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-rose-200">
                  <QRCodeCanvas
                    data-qr-code
                    value={referralLink}
                    size={200}
                    level="M"
                    fgColor="#C44569"
                    bgColor="#FFFFFF"
                    className="rounded-xl"
                  />
                  <div className="text-center mt-2">
                    <p className="text-xs font-medium text-rose-600">
                      💍 {supplierName}
                    </p>
                    <p className="text-xs text-gray-500">Scan to connect</p>
                  </div>
                </div>

                {/* Save Button */}
                <TouchFriendlyButton
                  onClick={saveQRToPhotos}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium"
                >
                  <Download className="w-4 h-4" />
                  Save to Photos
                </TouchFriendlyButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security & Stats */}
        <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Secure Sharing
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600">
                {shareCount}
              </div>
              <div className="text-xs text-blue-700">Shares Today</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">
                {isOffline ? 'Offline' : 'Online'}
              </div>
              <div className="text-xs text-gray-600">Status</div>
            </div>
          </div>

          {shareCount > 0 && (
            <div className="flex items-center gap-1 justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">Great job sharing!</span>
            </div>
          )}
        </div>

        {/* Mobile Optimization Info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4" />
            <span>Optimized for mobile sharing</span>
          </div>
          <p className="text-xs text-gray-500">
            Works perfectly at wedding venues with poor WiFi
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileReferralShare;
