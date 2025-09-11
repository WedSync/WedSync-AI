'use client';

import React from 'react';
import { Trophy, Star } from 'lucide-react';

interface MobileLeaderboardProps {
  loadImages?: boolean;
  getOptimizedImageUrl?: (url: string, width: number, height: number) => string;
  touchOptimizations?: any;
}

export const MobileLeaderboard: React.FC<MobileLeaderboardProps> = ({
  loadImages = true,
  getOptimizedImageUrl,
  touchOptimizations,
}) => {
  // Mock data for referral leaderboard
  const mockLeaderboard = [
    {
      id: 1,
      name: 'Sarah Photography',
      referrals: 24,
      avatar: '/avatars/sarah.jpg',
    },
    {
      id: 2,
      name: 'Elite Venues',
      referrals: 18,
      avatar: '/avatars/elite.jpg',
    },
    {
      id: 3,
      name: 'Bloom Florists',
      referrals: 15,
      avatar: '/avatars/bloom.jpg',
    },
    {
      id: 4,
      name: 'Sweet Cakes Co',
      referrals: 12,
      avatar: '/avatars/cakes.jpg',
    },
    { id: 5, name: 'Dream Decor', referrals: 9, avatar: '/avatars/decor.jpg' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="text-yellow-500" size={20} />
          Referral Leaderboard
        </h3>
        <p className="text-sm text-gray-600">
          Top performing vendors this month
        </p>
      </div>

      <div className="space-y-2 p-4">
        {mockLeaderboard.map((vendor, index) => (
          <div
            key={vendor.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              index < 3
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100'
                : 'bg-gray-50'
            } ${touchOptimizations?.touchTarget || 'min-h-[48px]'}`}
          >
            <div className="flex-shrink-0">
              {index < 3 ? (
                <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              )}
            </div>

            <div className="flex-grow">
              <h4 className="font-medium text-gray-900">{vendor.name}</h4>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star size={14} className="text-yellow-500" />
                <span>{vendor.referrals} referrals</span>
              </div>
            </div>

            {index < 3 && <Trophy size={16} className="text-yellow-500" />}
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Rankings update daily. Keep referring to climb higher!
        </p>
      </div>
    </div>
  );
};
