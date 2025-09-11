'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  MagicalTimeline,
  TimelineMoment,
  WeddingFile,
  WeddingPhase,
  StoryArc,
  VendorProfile,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Heart,
  Play,
  Download,
  Share2,
  Eye,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Video,
  FileText,
  Sparkles,
  Users,
  TrendingUp,
  Star,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

type TimelineView = 'chronological' | 'story' | 'vendor' | 'social';

interface TimelineContentProps {
  timeline: MagicalTimeline;
  selectedMoment?: TimelineMoment;
  view: TimelineView;
  sharingMode: boolean;
  selectedFiles: WeddingFile[];
  onFileAction: (action: string, file: WeddingFile) => void;
  onMomentSelect: (moment: TimelineMoment) => void;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  timeline,
  selectedMoment,
  view,
  sharingMode,
  selectedFiles,
  onFileAction,
  onMomentSelect,
}) => {
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });

  // Transform scroll to create parallax effect
  const y = useTransform(scrollY, [0, 1000], [0, -50]);

  const handleImageError = (fileId: string) => {
    setImageLoadErrors((prev) => new Set([...prev, fileId]));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'photo':
        return Camera;
      case 'document':
        return FileText;
      default:
        return Camera;
    }
  };

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Story Arc View
  const renderStoryView = () => {
    return (
      <div className="space-y-12">
        {timeline.storyArcs.map((arc, index) => (
          <motion.div
            key={arc.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            className="relative"
          >
            {/* Story Arc Header */}
            <div className="text-center mb-8">
              <motion.h2
                style={{ y }}
                className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4"
              >
                {arc.title}
              </motion.h2>
              <div className="max-w-2xl mx-auto text-gray-600 text-lg leading-relaxed">
                {arc.narrativeFlow?.introduction}
              </div>
            </div>

            {/* Story Arc Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-pink-200 to-purple-200 h-full"></div>

              {arc.keyMoments.map((moment, momentIndex) => {
                const isLeft = momentIndex % 2 === 0;
                const timelineMoment = timeline.moments.find(
                  (m) => m.id === moment.id,
                );

                if (!timelineMoment) return null;

                return (
                  <motion.div
                    key={moment.id}
                    initial={{ opacity: 0, x: isLeft ? -100 : 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 + momentIndex * 0.1 }}
                    className={`relative flex items-center mb-16 ${
                      isLeft ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {/* Timeline Dot */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                      <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full border-4 border-white shadow-lg">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Content Card */}
                    <Card
                      className={`w-5/12 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl bg-white/90 backdrop-blur-sm border-pink-100 ${
                        selectedMoment?.id === moment.id
                          ? 'ring-2 ring-pink-300 bg-pink-50'
                          : ''
                      }`}
                      onClick={() => onMomentSelect(timelineMoment)}
                      onMouseEnter={() => setHoveredMoment(moment.id)}
                      onMouseLeave={() => setHoveredMoment(null)}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {timelineMoment.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                              <Clock className="w-4 h-4" />
                              {new Date(
                                timelineMoment.timestamp,
                              ).toLocaleString()}
                              {timelineMoment.location && (
                                <>
                                  <MapPin className="w-4 h-4 ml-2" />
                                  {timelineMoment.location.venue ||
                                    timelineMoment.location.city}
                                </>
                              )}
                            </div>
                          </div>
                          {timelineMoment.viralPotential &&
                            timelineMoment.viralPotential > 70 && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Viral
                              </Badge>
                            )}
                        </div>

                        {timelineMoment.description && (
                          <p className="text-gray-700 leading-relaxed">
                            {timelineMoment.description}
                          </p>
                        )}

                        {/* Files Grid */}
                        {timelineMoment.files &&
                          timelineMoment.files.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {timelineMoment.files.slice(0, 6).map((file) => (
                                <FilePreview
                                  key={file.id}
                                  file={file}
                                  selected={selectedFiles.some(
                                    (f) => f.id === file.id,
                                  )}
                                  sharingMode={sharingMode}
                                  onAction={onFileAction}
                                  onImageError={() => handleImageError(file.id)}
                                  hasError={imageLoadErrors.has(file.id)}
                                />
                              ))}
                              {timelineMoment.files.length > 6 && (
                                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                  <div className="text-center">
                                    <span className="text-2xl font-bold text-gray-500">
                                      +{timelineMoment.files.length - 6}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      more
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        {/* Participants */}
                        {timelineMoment.participants &&
                          timelineMoment.participants.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <div className="flex -space-x-2">
                                {timelineMoment.participants
                                  .slice(0, 3)
                                  .map((participant, index) => (
                                    <Avatar
                                      key={index}
                                      className="w-6 h-6 border-2 border-white"
                                    >
                                      <AvatarFallback className="text-xs">
                                        {participant.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                {timelineMoment.participants.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                    <span className="text-xs text-gray-600">
                                      +{timelineMoment.participants.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Vendor View
  const renderVendorView = () => {
    const vendorGroups = useMemo(() => {
      const groups: Record<
        string,
        { vendor: VendorProfile; moments: TimelineMoment[] }
      > = {};

      timeline.moments.forEach((moment) => {
        if (moment.vendor) {
          const vendorId = moment.vendor.id;
          if (!groups[vendorId]) {
            groups[vendorId] = {
              vendor: moment.vendor,
              moments: [],
            };
          }
          groups[vendorId].moments.push(moment);
        }
      });

      return Object.values(groups);
    }, [timeline.moments]);

    return (
      <div className="space-y-8">
        {vendorGroups.map((group) => (
          <Card
            key={group.vendor.id}
            className="p-6 bg-white/90 backdrop-blur-sm border-purple-100"
          >
            {/* Vendor Header */}
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={group.vendor.portfolio[0]?.imageUrl} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  {group.vendor.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {group.vendor.businessName}
                    </h3>
                    <p className="text-gray-600">{group.vendor.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">4.9</span>
                      <span className="text-gray-500 text-sm">
                        (127 reviews)
                      </span>
                      {group.vendor.location && (
                        <>
                          <MapPin className="w-4 h-4 text-gray-400 ml-2" />
                          <span className="text-gray-500 text-sm">
                            {group.vendor.location.city}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Portfolio
                  </Button>
                </div>
              </div>
            </div>

            {/* Vendor's Moments */}
            <div className="grid lg:grid-cols-2 gap-6">
              {group.moments.map((moment) => (
                <Card
                  key={moment.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedMoment?.id === moment.id
                      ? 'ring-2 ring-purple-300 bg-purple-50'
                      : 'bg-white'
                  }`}
                  onClick={() => onMomentSelect(moment)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-gray-900">
                        {moment.title}
                      </h4>
                      <Badge variant="secondary">
                        {moment.files?.length || 0} files
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600">
                      {new Date(moment.timestamp).toLocaleString()}
                    </div>

                    {moment.files && moment.files.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {moment.files.slice(0, 4).map((file) => (
                          <FilePreview
                            key={file.id}
                            file={file}
                            selected={selectedFiles.some(
                              (f) => f.id === file.id,
                            )}
                            sharingMode={sharingMode}
                            onAction={onFileAction}
                            compact={true}
                            onImageError={() => handleImageError(file.id)}
                            hasError={imageLoadErrors.has(file.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Social/Viral View
  const renderSocialView = () => {
    const viralMoments = timeline.moments
      .filter((moment) => moment.viralPotential && moment.viralPotential > 60)
      .sort((a, b) => (b.viralPotential || 0) - (a.viralPotential || 0));

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Your Most Shareable Moments
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These moments have the highest viral potential and are optimized for
            social media sharing
          </p>
        </div>

        <div className="grid gap-6">
          {viralMoments.map((moment, index) => (
            <Card
              key={moment.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 ${
                selectedMoment?.id === moment.id
                  ? 'ring-2 ring-emerald-400'
                  : ''
              }`}
              onClick={() => onMomentSelect(moment)}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    #{index + 1}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {moment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-emerald-700">
                          {Math.round(moment.viralPotential || 0)}% Viral
                          Potential
                        </span>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Hot
                        </Badge>
                      </div>
                    </div>

                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Now
                    </Button>
                  </div>

                  {moment.aiInsights && moment.aiInsights.length > 0 && (
                    <div className="bg-white/80 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        AI Sharing Insights
                      </h4>
                      <ul className="space-y-1">
                        {moment.aiInsights.slice(0, 3).map((insight, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {insight.recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {moment.files && moment.files.length > 0 && (
                    <div className="grid grid-cols-6 gap-3">
                      {moment.files.slice(0, 6).map((file) => (
                        <FilePreview
                          key={file.id}
                          file={file}
                          selected={selectedFiles.some((f) => f.id === file.id)}
                          sharingMode={sharingMode}
                          onAction={onFileAction}
                          onImageError={() => handleImageError(file.id)}
                          hasError={imageLoadErrors.has(file.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Default chronological view
  const renderChronologicalView = () => {
    return (
      <div className="space-y-6">
        {timeline.moments.map((moment, index) => (
          <motion.div
            key={moment.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedMoment?.id === moment.id
                  ? 'ring-2 ring-blue-300 bg-blue-50'
                  : 'bg-white'
              }`}
              onClick={() => onMomentSelect(moment)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {moment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {new Date(moment.timestamp).toLocaleString()}
                        {moment.location && (
                          <>
                            <MapPin className="w-4 h-4 ml-2" />
                            {moment.location.venue || moment.location.city}
                          </>
                        )}
                      </div>
                    </div>

                    <Badge variant="secondary">
                      {moment.files?.length || 0} files
                    </Badge>
                  </div>

                  {moment.description && (
                    <p className="text-gray-700">{moment.description}</p>
                  )}

                  {moment.files && moment.files.length > 0 && (
                    <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
                      {moment.files.slice(0, 6).map((file) => (
                        <FilePreview
                          key={file.id}
                          file={file}
                          selected={selectedFiles.some((f) => f.id === file.id)}
                          sharingMode={sharingMode}
                          onAction={onFileAction}
                          onImageError={() => handleImageError(file.id)}
                          hasError={imageLoadErrors.has(file.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="timeline-content">
      {view === 'story' && renderStoryView()}
      {view === 'vendor' && renderVendorView()}
      {view === 'social' && renderSocialView()}
      {view === 'chronological' && renderChronologicalView()}
    </div>
  );
};

// File Preview Component
interface FilePreviewProps {
  file: WeddingFile;
  selected: boolean;
  sharingMode: boolean;
  onAction: (action: string, file: WeddingFile) => void;
  compact?: boolean;
  onImageError: () => void;
  hasError: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  selected,
  sharingMode,
  onAction,
  compact = false,
  onImageError,
  hasError,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const FileIcon = getFileIcon(file.type);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${
        selected ? 'ring-2 ring-pink-300' : ''
      } ${compact ? 'rounded-md' : 'rounded-lg'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onAction(sharingMode ? 'select' : 'view', file)}
    >
      {/* File Content */}
      {file.type === 'photo' && !hasError ? (
        <img
          src={file.thumbnailUrl || file.url}
          alt={file.metadata.description || 'Wedding photo'}
          className="w-full h-full object-cover"
          onError={onImageError}
        />
      ) : file.type === 'video' ? (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
          <Play className="w-8 h-8 text-white" />
          {file.thumbnailUrl && !hasError && (
            <img
              src={file.thumbnailUrl}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
              onError={onImageError}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <FileIcon className="w-8 h-8 text-gray-500" />
        </div>
      )}

      {/* Overlay */}
      <AnimatePresence>
        {(isHovered || selected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center"
          >
            <div className="flex gap-2">
              {!compact && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('download', file);
                    }}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('share', file);
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Viral Indicator */}
      {file.viralPotential > 80 && (
        <div className="absolute top-2 left-2">
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs px-2 py-1">
            <Sparkles className="w-3 h-3" />
          </Badge>
        </div>
      )}
    </motion.div>
  );
};

export default TimelineContent;
