'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TimelineMoment,
  KeyMoment,
  WeddingPhase,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  Heart,
  Camera,
  MapPin,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Image as ImageIcon,
} from 'lucide-react';

type TimelineView = 'chronological' | 'story' | 'vendor' | 'social';

interface TimelineNavigationProps {
  moments: KeyMoment[];
  selectedMoment?: TimelineMoment;
  onMomentSelect: (moment: TimelineMoment) => void;
  view: TimelineView;
  className?: string;
}

const TimelineNavigation: React.FC<TimelineNavigationProps> = ({
  moments,
  selectedMoment,
  onMomentSelect,
  view,
  className = '',
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<WeddingPhase>>(
    new Set(['ceremony', 'reception']),
  );
  const [showAllMoments, setShowAllMoments] = useState(false);

  // Group moments by wedding phase for chronological view
  const momentsByPhase = useMemo(() => {
    const grouped = moments.reduce(
      (acc, moment) => {
        const phase = moment.phase || 'planning';
        if (!acc[phase]) {
          acc[phase] = [];
        }
        acc[phase].push(moment);
        return acc;
      },
      {} as Record<WeddingPhase, KeyMoment[]>,
    );

    // Sort moments within each phase by timestamp
    Object.keys(grouped).forEach((phase) => {
      grouped[phase as WeddingPhase].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    });

    return grouped;
  }, [moments]);

  // Phase configuration
  const phaseConfig: Record<
    WeddingPhase,
    {
      label: string;
      icon: React.ComponentType<any>;
      color: string;
      bgColor: string;
      description: string;
    }
  > = {
    engagement: {
      label: 'Engagement',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: 'The beginning of forever',
    },
    planning: {
      label: 'Planning',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Bringing dreams to life',
    },
    pre_wedding: {
      label: 'Pre-Wedding',
      icon: Camera,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Building anticipation',
    },
    getting_ready: {
      label: 'Getting Ready',
      icon: Sparkles,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'The calm before joy',
    },
    ceremony: {
      label: 'Ceremony',
      icon: Heart,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      description: 'Your sacred moment',
    },
    cocktail_hour: {
      label: 'Cocktail Hour',
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      description: 'Celebration begins',
    },
    reception: {
      label: 'Reception',
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description: 'Party of a lifetime',
    },
    after_party: {
      label: 'After Party',
      icon: Play,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      description: 'The night continues',
    },
    honeymoon: {
      label: 'Honeymoon',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: 'Just the two of you',
    },
    anniversary: {
      label: 'Anniversary',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Celebrating your love',
    },
  };

  const togglePhaseExpansion = (phase: WeddingPhase) => {
    setExpandedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  };

  const getMomentIcon = (moment: KeyMoment) => {
    if (moment.files?.some((f) => f.type === 'video')) return Play;
    if (moment.files?.some((f) => f.type === 'photo')) return Camera;
    return ImageIcon;
  };

  const displayedMoments = showAllMoments ? moments : moments.slice(0, 8);

  if (view === 'chronological') {
    return (
      <div className={`timeline-navigation space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Wedding Timeline</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllMoments(!showAllMoments)}
            className="text-xs"
          >
            {showAllMoments ? 'Show Less' : `Show All (${moments.length})`}
          </Button>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {Object.entries(momentsByPhase).map(([phase, phaseMoments]) => {
              const config = phaseConfig[phase as WeddingPhase];
              const isExpanded = expandedPhases.has(phase as WeddingPhase);
              const Icon = config.icon;

              return (
                <div key={phase}>
                  <motion.button
                    onClick={() => togglePhaseExpansion(phase as WeddingPhase)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {config.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {phaseMoments.length} moments
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-6 mt-2 space-y-2"
                      >
                        {phaseMoments.map((moment) => {
                          const MomentIcon = getMomentIcon(moment);
                          const isSelected = selectedMoment?.id === moment.id;

                          return (
                            <motion.button
                              key={moment.id}
                              onClick={() =>
                                onMomentSelect(moment as TimelineMoment)
                              }
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`
                                w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                                ${
                                  isSelected
                                    ? 'bg-pink-100 border-2 border-pink-300 shadow-md'
                                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }
                              `}
                            >
                              <div
                                className={`p-2 rounded-full ${
                                  isSelected ? 'bg-pink-200' : 'bg-gray-100'
                                }`}
                              >
                                <MomentIcon
                                  className={`w-3 h-3 ${
                                    isSelected
                                      ? 'text-pink-600'
                                      : 'text-gray-600'
                                  }`}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div
                                  className={`font-medium text-sm truncate ${
                                    isSelected
                                      ? 'text-pink-900'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {moment.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {formatTime(moment.timestamp)}
                                  </span>
                                  {moment.files && moment.files.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-2 py-0"
                                    >
                                      {moment.files.length}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Default view for story, vendor, social views
  return (
    <div className={`timeline-navigation space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          {view === 'story' && 'Story Moments'}
          {view === 'vendor' && 'Vendor Highlights'}
          {view === 'social' && 'Viral Moments'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllMoments(!showAllMoments)}
          className="text-xs"
        >
          {showAllMoments ? 'Show Less' : `All (${moments.length})`}
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {displayedMoments.map((moment, index) => {
            const isSelected = selectedMoment?.id === moment.id;
            const MomentIcon = getMomentIcon(moment);

            return (
              <motion.button
                key={moment.id}
                onClick={() => onMomentSelect(moment as TimelineMoment)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all
                  ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 shadow-lg'
                      : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex-shrink-0">
                  <div
                    className={`p-2 rounded-full ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-200 to-purple-200'
                        : 'bg-gray-100'
                    }`}
                  >
                    <MomentIcon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-pink-600' : 'text-gray-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm truncate ${
                      isSelected ? 'text-pink-900' : 'text-gray-900'
                    }`}
                  >
                    {moment.title}
                  </div>

                  {moment.description && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {moment.description}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTime(moment.timestamp)}
                      </span>
                    </div>

                    {moment.files && moment.files.length > 0 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {moment.files.length} files
                      </Badge>
                    )}

                    {moment.viralPotential && moment.viralPotential > 70 && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0 bg-emerald-100 text-emerald-700"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Viral
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TimelineNavigation;
