import { Metadata } from 'next';
import { Suspense } from 'react';
import MobileReferralShare from '@/components/mobile/referrals/MobileReferralShare';
import CrossPlatformShare from '@/components/mobile/referrals/CrossPlatformShare';
import { MobileOptimizations } from '@/components/mobile/referrals/MobileOptimizations';
import { offlineReferralSupport } from '@/lib/pwa/offline-referrals';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Share, QrCode, Trophy, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mobile Referral Dashboard - WedSync',
  description:
    'Mobile-optimized referral sharing for wedding suppliers. Share your portfolio and grow your network.',
  viewport:
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
};

// Mock data - in real implementation, this would come from API/database
const mockReferralData = {
  supplierName: 'Amazing Wedding Photography',
  referralLink: 'https://wedsync.com/join?ref=ABC12345',
  qrCodeUrl: 'data:image/png;base64,mockqrcode',
  referralCode: 'ABC12345',
  vendorId: 'vendor-123',
  customMessage:
    '✨ Check out Amazing Wedding Photography for your special day! They capture the most beautiful moments 📸💍',
  stats: {
    totalShares: 47,
    conversions: 12,
    viralCoefficient: 2.3,
    rewardsEarned: 240,
  },
};

export default async function MobileReferralPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 pb-safe-area-inset-bottom">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500" />
              <h1 className="text-xl font-bold text-gray-900">
                Mobile Referrals
              </h1>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              Mobile Optimized
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Share your wedding portfolio with couples and vendors
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Quick Stats */}
        <Card className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {mockReferralData.stats.totalShares}
              </div>
              <div className="text-xs opacity-90">Total Shares</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {mockReferralData.stats.conversions}
              </div>
              <div className="text-xs opacity-90">New Signups</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {mockReferralData.stats.viralCoefficient}x
              </div>
              <div className="text-xs opacity-90">Viral Multiplier</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                £{mockReferralData.stats.rewardsEarned}
              </div>
              <div className="text-xs opacity-90">Rewards Earned</div>
            </div>
          </div>
        </Card>

        {/* Mobile Referral Share Component */}
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </Card>
          }
        >
          <MobileReferralShare
            referralLink={mockReferralData.referralLink}
            qrCodeUrl={mockReferralData.qrCodeUrl}
            supplierName={mockReferralData.supplierName}
            customMessage={mockReferralData.customMessage}
            vendorId={mockReferralData.vendorId}
            referralCode={mockReferralData.referralCode}
          />
        </Suspense>

        {/* Cross-Platform Sharing */}
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </Card>
          }
        >
          <CrossPlatformShare
            referralData={{
              link: mockReferralData.referralLink,
              code: mockReferralData.referralCode,
              supplierName: mockReferralData.supplierName,
              customMessage: mockReferralData.customMessage,
            }}
            onShareComplete={async (method, success) => {
              console.log(
                `Share via ${method}: ${success ? 'Success' : 'Failed'}`,
              );
              // Track sharing completion
              if (success) {
                await offlineReferralSupport.storePendingAction({
                  type: 'share',
                  data: {
                    method,
                    supplierName: mockReferralData.supplierName,
                    referralCode: mockReferralData.referralCode,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }}
          />
        </Suspense>

        {/* Mobile Performance Optimizations */}
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            </Card>
          }
        >
          <MobileOptimizations />
        </Suspense>

        {/* Wedding Context Tips */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 mb-2">
                Wedding Venue Tips
              </h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Share QR codes during venue tours and consultations</li>
                <li>• Use WhatsApp for instant sharing with couples</li>
                <li>• Works offline at venues with poor WiFi</li>
                <li>• Optimized for wedding glove compatibility</li>
                <li>• High contrast design for outdoor lighting</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex justify-center space-x-4 py-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
            <Share className="w-4 h-4" />
            <span className="text-sm">Share</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
            <QrCode className="w-4 h-4" />
            <span className="text-sm">QR Code</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Leaderboard</span>
          </button>
        </div>
      </div>

      {/* PWA Install Prompt would go here */}
      <div className="fixed bottom-safe-area-inset-bottom left-0 right-0 bg-gradient-to-t from-black/10 to-transparent h-16 pointer-events-none" />
    </div>
  );
}
