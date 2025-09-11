'use client';

import React, { useState, useCallback } from 'react';
import QRCode from 'qrcode.react';
import { Download, Share2, Copy, Check } from 'lucide-react';

interface MobileQRGeneratorProps {
  shouldOptimize?: boolean;
  onGenerated?: (qrCodeUrl: string) => Promise<void>;
  touchOptimizations?: any;
}

export const MobileQRGenerator: React.FC<MobileQRGeneratorProps> = ({
  shouldOptimize = false,
  onGenerated,
  touchOptimizations,
}) => {
  const [referralCode] = useState('REF-DEMO-2024');
  const [copied, setCopied] = useState(false);

  // Generate referral URL
  const referralUrl = `https://wedsync.com/join?ref=${referralCode}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [referralUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join WedSync',
          text: 'Plan your wedding with WedSync - the easiest way to manage your big day!',
          url: referralUrl,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  }, [referralUrl, handleCopy]);

  const handleDownload = useCallback(() => {
    const canvas = document.querySelector(
      '.qr-code canvas',
    ) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `wedsync-referral-${referralCode}.png`;
      link.href = url;
      link.click();
    }
  }, [referralCode]);

  // QR code size based on optimization settings
  const qrSize = shouldOptimize ? 150 : 200;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Your Referral QR Code</h3>
        <p className="text-sm text-gray-600">
          Share this code to earn referral bonuses
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="qr-code bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
            <QRCode
              value={referralUrl}
              size={qrSize}
              level="M"
              includeMargin
              fgColor="#1f2937"
              bgColor="#ffffff"
            />
          </div>
        </div>

        {/* Referral Code */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Referral Code</p>
          <div className="inline-flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <code className="font-mono font-medium text-gray-900">
              {referralCode}
            </code>
          </div>
        </div>

        {/* URL Display */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Referral URL:</p>
          <p className="text-sm text-gray-900 font-mono break-all">
            {referralUrl}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleCopy}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border transition-colors
              ${copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
              ${touchOptimizations?.touchTarget || 'min-h-[48px]'}
            `}
            style={{ touchAction: 'manipulation' }}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            <span className="text-xs mt-1">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleShare}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors
              ${touchOptimizations?.touchTarget || 'min-h-[48px]'}
            `}
            style={{ touchAction: 'manipulation' }}
          >
            <Share2 size={20} />
            <span className="text-xs mt-1">Share</span>
          </button>

          <button
            onClick={handleDownload}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors
              ${touchOptimizations?.touchTarget || 'min-h-[48px]'}
            `}
            style={{ touchAction: 'manipulation' }}
          >
            <Download size={20} />
            <span className="text-xs mt-1">Save</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            How to use:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Share the QR code with couples or other vendors</li>
            <li>• They scan it to join WedSync with your referral</li>
            <li>• You earn rewards for each successful referral</li>
            <li>• Track your progress in the leaderboard above</li>
          </ul>
        </div>

        {/* Optimization Notice */}
        {shouldOptimize && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              📊 QR code optimized for your connection speed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
