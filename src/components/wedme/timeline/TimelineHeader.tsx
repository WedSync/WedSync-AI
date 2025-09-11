'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CoupleProfile } from '@/types/wedme/file-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Calendar,
  Heart,
  Share2,
  Sparkles,
  Camera,
  Play,
  Grid3X3,
  Timeline,
  Users,
  TrendingUp,
  MapPin,
  Download,
} from 'lucide-react';

type TimelineView = 'chronological' | 'story' | 'vendor' | 'social';

interface TimelineStats {
  totalFiles: number;
  totalMoments: number;
  keyMoments: number;
  viralPotential: number;
}

interface TimelineHeaderProps {
  couple: CoupleProfile;
  weddingDate: Date;
  stats: TimelineStats;
  onViewChange: (view: TimelineView) => void;
  onShareToggle: () => void;
  currentView: TimelineView;
  sharingActive: boolean;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  couple,
  weddingDate,
  stats,
  onViewChange,
  onShareToggle,
  currentView,
  sharingActive,
}) => {
  const [showFullStats, setShowFullStats] = useState(false);

  const viewButtons = [
    {
      id: 'story' as const,
      label: 'Love Story',
      icon: Heart,
      description: 'AI-crafted narrative of your journey',
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: 'chronological' as const,
      label: 'Timeline',
      icon: Timeline,
      description: 'Chronological order of events',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'vendor' as const,
      label: 'Vendors',
      icon: Users,
      description: 'Organized by your amazing vendors',
      color: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'social' as const,
      label: 'Viral',
      icon: TrendingUp,
      description: 'Optimized for social sharing',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="bg-gradient-to-r from-pink-50 via-white to-purple-50 border-b border-pink-100">
      <div className="container mx-auto px-4 py-6">
        {/* Main Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Couple Info */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full">
                  <Sparkles className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {couple.partnerOne.name} & {couple.partnerTwo.name}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {formatDate(weddingDate)}
                    </span>
                    {couple.weddingLocation && (
                      <>
                        <MapPin className="w-4 h-4 ml-2" />
                        <span>
                          {couple.weddingLocation.city},{' '}
                          {couple.weddingLocation.state}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {stats.totalFiles} memories
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {stats.keyMoments} key moments
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 hover:from-pink-200 hover:to-purple-200"
                >
                  {stats.viralPotential}% Viral Potential
                </Badge>
              </div>
            </motion.div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFullStats(!showFullStats)}
              className="hidden lg:flex border-pink-200 hover:bg-pink-50"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Stats
            </Button>

            <Button
              onClick={onShareToggle}
              className={`bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg ${
                sharingActive ? 'ring-2 ring-pink-300 ring-offset-2' : ''
              }`}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {sharingActive ? 'Close Sharing' : 'Share Memories'}
            </Button>
          </div>
        </div>

        {/* View Selector */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {viewButtons.map((button) => {
              const Icon = button.icon;
              const isActive = currentView === button.id;

              return (
                <motion.button
                  key={button.id}
                  onClick={() => onViewChange(button.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? `bg-gradient-to-r ${button.color} text-white shadow-lg`
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold text-sm lg:text-base">
                      {button.label}
                    </div>
                    <div
                      className={`text-xs ${
                        isActive ? 'text-white/80' : 'text-gray-500'
                      } hidden lg:block`}
                    >
                      {button.description}
                    </div>
                  </div>

                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-xl ring-2 ring-white/50"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Expanded Stats */}
        {showFullStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-pink-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-600 mb-1">
                    {stats.totalFiles}
                  </div>
                  <div className="text-sm text-gray-600">Total Files</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {stats.totalMoments}
                  </div>
                  <div className="text-sm text-gray-600">Timeline Moments</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {stats.keyMoments}
                  </div>
                  <div className="text-sm text-gray-600">Key Highlights</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {stats.viralPotential}%
                  </div>
                  <div className="text-sm text-gray-600">Viral Potential</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Your wedding story has incredible sharing potential!
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Boost Virality
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TimelineHeader;
