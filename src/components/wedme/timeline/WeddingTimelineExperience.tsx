'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CoupleProfile,
  WeddingFile,
  TimelineMoment,
  MagicalTimeline,
  ViralSharingRequest,
  TimelineView,
  SharingMode,
} from '@/types/wedme/file-management';
import TimelineHeader from './TimelineHeader';
import TimelineNavigation from './TimelineNavigation';
import TimelineContent from './TimelineContent';
import TimelineMomentDetails from './TimelineMomentDetails';
import ViralSharingPanel from './ViralSharingPanel';
import { createMagicalTimeline } from '@/lib/wedme/timeline-engine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Share2,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Camera,
  Play,
  Download,
  Eye,
} from 'lucide-react';

type TimelineView = 'chronological' | 'story' | 'vendor' | 'social';

interface WeddingTimelineExperienceProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  onTimelineMomentSelect: (moment: TimelineMoment) => void;
  className?: string;
}

const WeddingTimelineExperience: React.FC<WeddingTimelineExperienceProps> = ({
  couple,
  files,
  onTimelineMomentSelect,
  className = '',
}) => {
  const [timelineView, setTimelineView] = useState<TimelineView>('story');
  const [selectedMoment, setSelectedMoment] = useState<TimelineMoment>();
  const [sharingMode, setSharingMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<WeddingFile[]>([]);

  // Create magical timeline with AI enhancement
  const magicalTimeline = useMemo(() => {
    return createMagicalTimeline(files, {
      couplePreferences: couple.preferences,
      aiEnhancement: true,
      storyNarrative: true,
      emotionalCurve: true,
      socialOptimization: true,
      weddingDate: couple.weddingDate,
      weddingStyle: couple.weddingStyle,
    });
  }, [files, couple]);

  // Handle moment selection
  const handleMomentSelect = useCallback(
    (moment: TimelineMoment) => {
      setSelectedMoment(moment);
      onTimelineMomentSelect(moment);
    },
    [onTimelineMomentSelect],
  );

  // Handle file actions
  const handleFileAction = useCallback((action: string, file: WeddingFile) => {
    switch (action) {
      case 'select':
        setSelectedFiles((prev) =>
          prev.some((f) => f.id === file.id)
            ? prev.filter((f) => f.id !== file.id)
            : [...prev, file],
        );
        break;
      case 'share':
        setSelectedFiles([file]);
        setSharingMode(true);
        break;
      case 'download':
        // Handle download
        window.open(file.url, '_blank');
        break;
      case 'view':
        // Handle view in fullscreen
        setIsFullscreen(true);
        break;
    }
  }, []);

  // Handle viral sharing
  const handleViralShare = useCallback(
    async (shareRequest: ViralSharingRequest) => {
      try {
        // TODO: Implement viral sharing API call
        console.log('Initiating viral share:', shareRequest);

        // Close sharing mode after successful share
        setSharingMode(false);
        setSelectedFiles([]);
      } catch (error) {
        console.error('Viral sharing failed:', error);
      }
    },
    [],
  );

  // Timeline statistics
  const timelineStats = useMemo(() => {
    const totalFiles = files.length;
    const totalMoments = magicalTimeline.moments.length;
    const keyMoments = magicalTimeline.keyMoments.length;
    const viralPotential = magicalTimeline.viralPotential;

    return {
      totalFiles,
      totalMoments,
      keyMoments,
      viralPotential: Math.round(viralPotential * 100),
    };
  }, [files, magicalTimeline]);

  return (
    <div
      className={`wedding-timeline-experience min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 ${className}`}
    >
      {/* Timeline Header */}
      <TimelineHeader
        couple={couple}
        weddingDate={couple.weddingDate}
        stats={timelineStats}
        onViewChange={setTimelineView}
        onShareToggle={() => setSharingMode(!sharingMode)}
        currentView={timelineView}
        sharingActive={sharingMode}
      />

      {/* Main Timeline Container */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Timeline Navigation - Left Sidebar */}
          <div className="lg:col-span-3">
            <Card className="sticky top-6 p-6 bg-white/80 backdrop-blur-sm border-pink-100">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Your Love Story
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(couple.weddingDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-pink-50 rounded-lg">
                    <div className="font-bold text-pink-600">
                      {timelineStats.totalFiles}
                    </div>
                    <div className="text-gray-600">Memories</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">
                      {timelineStats.keyMoments}
                    </div>
                    <div className="text-gray-600">Key Moments</div>
                  </div>
                </div>

                <TimelineNavigation
                  moments={magicalTimeline.keyMoments}
                  selectedMoment={selectedMoment}
                  onMomentSelect={handleMomentSelect}
                  view={timelineView}
                  className="mt-4"
                />
              </div>
            </Card>
          </div>

          {/* Main Timeline Content */}
          <div className="lg:col-span-9">
            <TimelineContent
              timeline={magicalTimeline}
              selectedMoment={selectedMoment}
              view={timelineView}
              sharingMode={sharingMode}
              selectedFiles={selectedFiles}
              onFileAction={handleFileAction}
              onMomentSelect={handleMomentSelect}
            />
          </div>
        </div>

        {/* Moment Details Panel */}
        <AnimatePresence>
          {selectedMoment && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl"
            >
              <TimelineMomentDetails
                moment={selectedMoment}
                files={selectedMoment?.files || []}
                onFileAction={handleFileAction}
                socialSharing={couple.socialSettings}
                familySharing={couple.familySettings}
                onClose={() => setSelectedMoment(undefined)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viral Sharing Panel */}
        <AnimatePresence>
          {sharingMode && (
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white border-l border-gray-200 shadow-2xl"
            >
              <ViralSharingPanel
                timeline={magicalTimeline}
                selectedMoment={selectedMoment}
                selectedFiles={selectedFiles}
                couple={couple}
                onViralShare={handleViralShare}
                onClose={() => {
                  setSharingMode(false);
                  setSelectedFiles([]);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button
          onClick={() => setSharingMode(!sharingMode)}
          size="lg"
          className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-xl"
        >
          <Share2 className="w-6 h-6" />
        </Button>
      </div>

      {/* Timeline Overview Stats - Mobile */}
      <div className="lg:hidden fixed top-4 left-4 right-4 z-40">
        <Card className="p-4 bg-white/90 backdrop-blur-sm border-pink-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              <span className="font-semibold text-gray-900">Your Story</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Camera className="w-4 h-4" />
                {timelineStats.totalFiles}
              </div>
              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                {timelineStats.viralPotential}% Viral
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WeddingTimelineExperience;
