'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  Heart,
  Calendar,
  MapPin,
  Clock,
  Users,
  Camera,
  Video,
  Music,
  Share2,
  Download,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Star,
  MessageCircle,
  Eye,
  ExternalLink,
  Sparkles,
  ArrowUp,
  Filter,
  Search,
  Grid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  TimelineMoment,
  CoupleProfile,
  WeddingFile,
  EmotionalCurve,
  SharingGroup,
  ContentSuggestion,
} from '@/types/wedme/file-management';
import {
  ImageOptimizer,
  LazyLoader,
  ProgressiveLoader,
} from '@/lib/wedme/performance-optimization';

interface MobileTimelineViewProps {
  timeline: TimelineMoment[];
  couple: CoupleProfile;
  emotionalCurve?: EmotionalCurve;
  onMomentSelect?: (moment: TimelineMoment) => void;
  onShare?: (moment: TimelineMoment, groups: SharingGroup[]) => void;
  onViewFile?: (file: WeddingFile) => void;
}

export const MobileTimelineView: React.FC<MobileTimelineViewProps> = ({
  timeline,
  couple,
  emotionalCurve,
  onMomentSelect,
  onShare,
  onViewFile,
}) => {
  const [selectedMoment, setSelectedMoment] = useState<TimelineMoment | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'moments' | 'story'>(
    'timeline',
  );
  const [showScrollTop, setShowScrollTop] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.9]);

  // Progressive loading for timeline moments
  const [visibleMoments, setVisibleMoments] = useState<TimelineMoment[]>([]);
  const progressiveLoader = useMemo(() => new ProgressiveLoader(), []);

  useEffect(() => {
    const loadMoments = async () => {
      const filteredMoments = timeline.filter(
        (moment) =>
          searchQuery === '' ||
          moment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          moment.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          moment.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );

      const loaded = await progressiveLoader.loadBatch(filteredMoments, {
        batchSize: 10,
        loadDelay: 100,
      });

      setVisibleMoments(loaded);
    };

    loadMoments();
  }, [timeline, searchQuery, progressiveLoader]);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setShowScrollTop(scrollTop > 200);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAutoPlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && currentMomentIndex < visibleMoments.length - 1) {
      const interval = setInterval(() => {
        setCurrentMomentIndex((prev) => {
          if (prev >= visibleMoments.length - 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEmotionalIntensity = (timestamp: Date) => {
    if (!emotionalCurve) return 0.5;
    // Calculate emotional intensity based on curve
    const timeProgress =
      (timestamp.getTime() - timeline[0]?.timestamp.getTime()) /
      (timeline[timeline.length - 1]?.timestamp.getTime() -
        timeline[0]?.timestamp.getTime());
    return (
      emotionalCurve.dataPoints.find(
        (point) => Math.abs(point.timestamp - timeProgress) < 0.1,
      )?.intensity || 0.5
    );
  };

  const formatTimeElapsed = (startTime: Date, currentTime: Date) => {
    const diff = currentTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-rose-50 to-pink-50 safe-area-inset">
      {/* Mobile Header with Parallax Effect */}
      <motion.div
        style={{ opacity: headerOpacity }}
        className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rose-200"
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {couple.partnerOne.firstName} & {couple.partnerTwo.firstName}
              </h1>
              <p className="text-sm text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {couple.weddingDate
                  ? new Date(couple.weddingDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Wedding Timeline'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={isPlaying ? 'default' : 'outline'}
                onClick={handleAutoPlay}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button size="sm" variant="outline">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search moments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-2 bg-gray-50 border-gray-200 focus:bg-white text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setViewMode(viewMode === 'timeline' ? 'moments' : 'timeline')
              }
            >
              {viewMode === 'timeline' ? (
                <Grid className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center space-x-3">
            <Progress
              value={
                (currentMomentIndex / Math.max(visibleMoments.length - 1, 1)) *
                100
              }
              className="flex-1 h-2"
            />
            <span className="text-xs text-gray-500 min-w-0">
              {currentMomentIndex + 1} / {visibleMoments.length}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {viewMode === 'timeline' ? (
            <TimelineView
              moments={visibleMoments}
              currentIndex={currentMomentIndex}
              onMomentSelect={setSelectedMoment}
              onShare={onShare}
              onViewFile={onViewFile}
              emotionalCurve={emotionalCurve}
              getEmotionalIntensity={getEmotionalIntensity}
            />
          ) : (
            <MomentsGridView
              moments={visibleMoments}
              onMomentSelect={setSelectedMoment}
              onShare={onShare}
              onViewFile={onViewFile}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Buttons */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-20 right-4 safe-area-inset-bottom"
          >
            <Button
              size="sm"
              onClick={scrollToTop}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-12 h-12 shadow-lg"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Moment Detail Modal */}
      <AnimatePresence>
        {selectedMoment && (
          <MomentDetailModal
            moment={selectedMoment}
            onClose={() => setSelectedMoment(null)}
            onShare={onShare}
            onViewFile={onViewFile}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface TimelineViewProps {
  moments: TimelineMoment[];
  currentIndex: number;
  onMomentSelect: (moment: TimelineMoment) => void;
  onShare?: (moment: TimelineMoment, groups: SharingGroup[]) => void;
  onViewFile?: (file: WeddingFile) => void;
  emotionalCurve?: EmotionalCurve;
  getEmotionalIntensity: (timestamp: Date) => number;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  moments,
  currentIndex,
  onMomentSelect,
  onShare,
  onViewFile,
  getEmotionalIntensity,
}) => {
  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative px-4 py-6"
    >
      {/* Timeline Line */}
      <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gradient-to-b from-rose-200 via-pink-300 to-rose-200" />

      {/* Timeline Moments */}
      <div className="space-y-6">
        {moments.map((moment, index) => {
          const intensity = getEmotionalIntensity(moment.timestamp);
          const isActive = index === currentIndex;

          return (
            <motion.div
              key={moment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Timeline Node */}
              <div
                className={`absolute left-6 w-4 h-4 rounded-full border-4 border-white shadow-lg z-10 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-400 to-pink-500 ring-4 ring-rose-200'
                    : intensity > 0.7
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : intensity > 0.4
                        ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                        : 'bg-gradient-to-r from-gray-300 to-gray-400'
                }`}
                style={{ top: '1rem' }}
              />

              {/* Moment Card */}
              <div className="ml-16">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 ${
                      isActive
                        ? 'ring-2 ring-rose-300 shadow-lg bg-rose-50'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => onMomentSelect(moment)}
                  >
                    <CardContent className="p-4">
                      {/* Moment Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {moment.title}
                            </h3>
                            {moment.isHighlight && (
                              <Sparkles className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {moment.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {moment.location && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {moment.location}
                              </span>
                            )}
                            {moment.participants && (
                              <span className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {moment.participants.length}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            intensity > 0.7
                              ? 'bg-yellow-100 text-yellow-800'
                              : intensity > 0.4
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {moment.category}
                        </Badge>
                      </div>

                      {/* Description */}
                      {moment.description && (
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {moment.description}
                        </p>
                      )}

                      {/* Files Preview */}
                      {moment.files && moment.files.length > 0 && (
                        <div className="flex space-x-2 mb-3 overflow-x-auto">
                          {moment.files.slice(0, 4).map((file, fileIndex) => (
                            <motion.div
                              key={fileIndex}
                              whileHover={{ scale: 1.05 }}
                              className="flex-shrink-0 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewFile?.(file);
                              }}
                            >
                              {file.category === 'photos' &&
                              file.thumbnailUrl ? (
                                <LazyLoader threshold={0.2}>
                                  <img
                                    src={file.thumbnailUrl}
                                    alt={file.filename}
                                    className="w-16 h-16 object-cover rounded-lg shadow-sm"
                                    loading="lazy"
                                  />
                                </LazyLoader>
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <FileIcon category={file.category} />
                                </div>
                              )}
                            </motion.div>
                          ))}
                          {moment.files.length > 4 && (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-500 font-medium">
                                +{moment.files.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {moment.tags && moment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {moment.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {moment.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{moment.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {moment.engagement && (
                            <>
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                {moment.engagement.likes}
                              </span>
                              <span className="flex items-center">
                                <MessageCircle className="w-3 h-3 mr-1" />
                                {moment.engagement.comments}
                              </span>
                              <span className="flex items-center">
                                <Eye className="w-3 h-3 mr-1" />
                                {moment.engagement.views}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShare?.(moment, []);
                            }}
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMomentSelect(moment);
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

interface MomentsGridViewProps {
  moments: TimelineMoment[];
  onMomentSelect: (moment: TimelineMoment) => void;
  onShare?: (moment: TimelineMoment, groups: SharingGroup[]) => void;
  onViewFile?: (file: WeddingFile) => void;
}

const MomentsGridView: React.FC<MomentsGridViewProps> = ({
  moments,
  onMomentSelect,
  onShare,
  onViewFile,
}) => {
  return (
    <motion.div
      key="grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-6"
    >
      <div className="grid grid-cols-1 gap-4">
        {moments.map((moment, index) => (
          <motion.div
            key={moment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onMomentSelect(moment)}
            >
              <CardContent className="p-0">
                {/* Hero Image */}
                {moment.files &&
                  moment.files[0] &&
                  moment.files[0].category === 'photos' && (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <LazyLoader threshold={0.1}>
                        <img
                          src={moment.files[0].thumbnailUrl}
                          alt={moment.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </LazyLoader>
                      {moment.isHighlight && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-500 text-white">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Highlight
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {moment.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {moment.category}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {moment.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {moment.location && (
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {moment.location}
                      </span>
                    )}
                  </div>

                  {moment.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {moment.description}
                    </p>
                  )}

                  {/* File Count */}
                  {moment.files && moment.files.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Camera className="w-3 h-3 mr-1" />
                        {moment.files.length} files
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare?.(moment, []);
                        }}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

interface MomentDetailModalProps {
  moment: TimelineMoment;
  onClose: () => void;
  onShare?: (moment: TimelineMoment, groups: SharingGroup[]) => void;
  onViewFile?: (file: WeddingFile) => void;
}

const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  moment,
  onClose,
  onShare,
  onViewFile,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {moment.title}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onShare?.(moment, [])}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Time and Location */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {moment.timestamp.toLocaleString()}
              </span>
              {moment.location && (
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {moment.location}
                </span>
              )}
            </div>

            {/* Description */}
            {moment.description && (
              <p className="text-gray-700 leading-relaxed">
                {moment.description}
              </p>
            )}

            {/* Files */}
            {moment.files && moment.files.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Files ({moment.files.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {moment.files.map((file, index) => (
                    <div
                      key={index}
                      className="aspect-square cursor-pointer rounded-lg overflow-hidden"
                      onClick={() => onViewFile?.(file)}
                    >
                      {file.category === 'photos' && file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.filename}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <FileIcon category={file.category} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {moment.tags && moment.tags.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {moment.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            {moment.participants && moment.participants.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  People ({moment.participants.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {moment.participants.map((participant, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-xs">
                          {participant.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700">
                        {participant.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Stats */}
            {moment.engagement && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2">Engagement</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Heart className="w-4 h-4 mr-1 text-red-500" />
                    {moment.engagement.likes} likes
                  </span>
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1 text-blue-500" />
                    {moment.engagement.comments} comments
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1 text-gray-500" />
                    {moment.engagement.views} views
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FileIcon: React.FC<{ category: string }> = ({ category }) => {
  switch (category) {
    case 'photos':
      return <Camera className="w-6 h-6 text-gray-500" />;
    case 'videos':
      return <Video className="w-6 h-6 text-gray-500" />;
    case 'audio':
      return <Music className="w-6 h-6 text-gray-500" />;
    default:
      return <Camera className="w-6 h-6 text-gray-500" />;
  }
};

export default MobileTimelineView;
