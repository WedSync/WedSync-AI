'use client';

import { useState } from 'react';
import {
  ReferralWidget,
  ReferralStats,
} from '@/components/viral/ReferralWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockStats: ReferralStats = {
  totalReferrals: 12,
  activeReferrals: 8,
  pendingRewards: 250,
  totalEarned: 1200,
  conversionRate: 75.5,
};

export default function TestReferralWidgetPage() {
  const [lastAction, setLastAction] = useState<string>('');

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams('');

  const referralCode = searchParams.get('code') || 'WEDDING1';
  const referralUrl = `https://wedsync.com/signup?ref=${referralCode}`;

  const handleCodeCopy = () => {
    setLastAction('Code copied');
    if (typeof window !== 'undefined' && (window as any).callbackTracker) {
      (window as any).callbackTracker.onCodeCopy++;
    }
  };

  const handleShare = (platform: string) => {
    setLastAction(`Shared on ${platform}`);
    if (typeof window !== 'undefined' && (window as any).callbackTracker) {
      (window as any).callbackTracker.onShare++;
    }
  };

  const handleQRGenerate = () => {
    setLastAction('QR code generated');
    if (typeof window !== 'undefined' && (window as any).callbackTracker) {
      (window as any).callbackTracker.onQRCodeGenerate++;
    }
  };

  const handleQRDownload = (dataUrl: string) => {
    setLastAction('QR code downloaded');
    console.log('QR downloaded:', dataUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ReferralWidget Test Page
          </h1>
          <p className="text-gray-600">
            Test page for E2E testing of the ReferralWidget component
          </p>
        </div>

        {/* Test Status */}
        {lastAction && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-800">
                Last Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700">{lastAction}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Component */}
        <div className="flex justify-center">
          <ReferralWidget
            referralCode={referralCode}
            referralUrl={referralUrl}
            stats={mockStats}
            onCodeCopy={handleCodeCopy}
            onShare={handleShare}
            onQRCodeGenerate={handleQRGenerate}
            onQRCodeDownload={handleQRDownload}
          />
        </div>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Test URLs:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>
                  • Default: <code>/test-referral-widget</code>
                </li>
                <li>
                  • Custom code:{' '}
                  <code>/test-referral-widget?code=TESTCODE</code>
                </li>
                <li>
                  • Different code:{' '}
                  <code>/test-referral-widget?code=NEWCODE1</code>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Test Data:</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-auto">
                {JSON.stringify(
                  {
                    referralCode,
                    referralUrl,
                    stats: mockStats,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
