'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SparklesIcon,
  ShareIcon,
  BuildingOffice2Icon,
  HandshakeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  UserGroupIcon,
  StarIcon,
  HeartIcon,
  GiftIcon,
  CameraIcon,
  MusicalNoteIcon,
  CakeIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import {
  MilestoneNotification,
  MilestoneType,
  ShareableAsset,
} from '@/types/couple-notifications';

interface MilestoneNotificationGridProps {
  milestones: MilestoneNotification[];
  onCelebrate: (milestone: MilestoneNotification) => void;
  onShare: (milestoneId: string) => void;
}

export function MilestoneNotificationGrid({
  milestones,
  onCelebrate,
  onShare,
}: MilestoneNotificationGridProps) {
  const [selectedMilestone, setSelectedMilestone] =
    useState<MilestoneNotification | null>(null);
  const [celebratingMilestone, setCelebratingMilestone] = useState<
    string | null
  >(null);

  const handleCelebrate = (milestone: MilestoneNotification) => {
    setCelebratingMilestone(milestone.milestoneId);
    onCelebrate(milestone);

    // Remove celebrating state after animation
    setTimeout(() => {
      setCelebratingMilestone(null);
    }, 2000);
  };

  return (
    <div className="milestone-grid space-y-8">
      {/* Header */}
      <motion.div
        className="milestone-header text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-yellow-500" />
          🎉 Your Wedding Journey Milestones
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Celebrating every magical step toward your perfect day! Each milestone
          brings you closer to "I do" 💍
        </p>
      </motion.div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {milestones.map((milestone, index) => (
            <MilestoneCard
              key={milestone.milestoneId}
              milestone={milestone}
              index={index}
              isSelected={
                selectedMilestone?.milestoneId === milestone.milestoneId
              }
              isCelebrating={celebratingMilestone === milestone.milestoneId}
              onSelect={setSelectedMilestone}
              onCelebrate={() => handleCelebrate(milestone)}
              onShare={() => onShare(milestone.milestoneId)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {milestones.length === 0 && <EmptyMilestoneState />}

      {/* Milestone Detail Modal */}
      <AnimatePresence>
        {selectedMilestone && (
          <MilestoneDetailModal
            milestone={selectedMilestone}
            onClose={() => setSelectedMilestone(null)}
            onCelebrate={() => handleCelebrate(selectedMilestone)}
            onShare={() => onShare(selectedMilestone.milestoneId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface MilestoneCardProps {
  milestone: MilestoneNotification;
  index: number;
  isSelected: boolean;
  isCelebrating: boolean;
  onSelect: (milestone: MilestoneNotification) => void;
  onCelebrate: () => void;
  onShare: () => void;
}

function MilestoneCard({
  milestone,
  index,
  isSelected,
  isCelebrating,
  onSelect,
  onCelebrate,
  onShare,
}: MilestoneCardProps) {
  const milestoneIcon = getMilestoneIcon(milestone.milestoneType);
  const achievementColors = getAchievementColors(milestone.achievementLevel);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: 1,
        scale: isCelebrating ? [1, 1.05, 1] : 1,
        y: 0,
        rotate: isCelebrating ? [0, 2, -2, 0] : 0,
      }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        scale: { duration: 0.3, repeat: isCelebrating ? 3 : 0 },
        rotate: { duration: 0.2, repeat: isCelebrating ? 6 : 0 },
      }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      }}
      className={`
        milestone-card relative bg-white rounded-2xl p-6 cursor-pointer border-2 transition-all
        ${
          isSelected
            ? 'border-rose-300 shadow-xl shadow-rose-100'
            : 'border-gray-100 hover:border-rose-200 shadow-lg'
        }
        ${isCelebrating ? 'animate-pulse bg-gradient-to-br from-yellow-50 to-rose-50' : ''}
      `}
      onClick={() => onSelect(milestone)}
    >
      {/* Celebration Confetti Effect */}
      {isCelebrating && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: [0, 1, 0],
                rotate: 360,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}

      {/* Achievement Badge */}
      <div className="absolute -top-3 -right-3">
        <motion.div
          className={`
            px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
            ${achievementColors.bg} ${achievementColors.text} shadow-lg
          `}
          animate={{
            scale: isCelebrating ? [1, 1.2, 1] : 1,
            rotate: isCelebrating ? [0, 5, -5, 0] : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          {milestone.achievementLevel}
        </motion.div>
      </div>

      {/* Milestone Visual */}
      <div className="milestone-visual text-center mb-6">
        <motion.div
          className="milestone-icon inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 mb-4"
          animate={{
            rotate: isCelebrating ? [0, 360] : [0, 5, -5, 0],
            scale: isCelebrating ? [1, 1.2, 1] : [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 1, repeat: isCelebrating ? 2 : 0 },
            scale: { duration: 2, repeat: Infinity, repeatDelay: 5 },
          }}
        >
          {milestoneIcon}
        </motion.div>

        <div className="milestone-date text-sm text-gray-500">
          {format(new Date(milestone.celebratedAt), 'MMM do, yyyy')}
        </div>
      </div>

      {/* Milestone Content */}
      <div className="milestone-content space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {milestone.celebrationContent.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {milestone.celebrationContent.description}
          </p>
        </div>

        {milestone.progressVisualization && (
          <div className="progress-visualization">
            <ProgressVisualization
              progress={milestone.progressVisualization.currentProgress}
              total={milestone.progressVisualization.totalSteps}
              type={milestone.progressVisualization.visualType}
              label={`${milestone.progressVisualization.currentProgress}/${milestone.progressVisualization.totalSteps} completed`}
            />
          </div>
        )}

        {/* Sharing Stats */}
        {milestone.sharedCount > 0 && (
          <div className="sharing-stats text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <HeartIcon className="w-4 h-4 text-rose-400" />
              <span>{milestone.sharedCount} friends celebrated with you!</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="milestone-actions flex gap-3 mt-6">
        <motion.button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onCelebrate();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SparklesIcon className="w-5 h-5" />
          Celebrate!
        </motion.button>

        <motion.button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ShareIcon className="w-5 h-5" />
          Share Joy
        </motion.button>
      </div>

      {/* Shareable Assets Preview */}
      {milestone.shareableAssets && milestone.shareableAssets.length > 0 && (
        <div className="shareable-preview mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Ready to share:</div>
          <div className="flex gap-2 overflow-x-auto">
            {milestone.shareableAssets.slice(0, 3).map((asset, index) => (
              <ShareableAssetPreview
                key={asset.assetId}
                asset={asset}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getMilestoneIcon(milestoneType: MilestoneType): JSX.Element {
  const iconMap = {
    venue_booked: <BuildingOffice2Icon className="w-10 h-10 text-rose-500" />,
    vendor_confirmed: <HandshakeIcon className="w-10 h-10 text-green-500" />,
    budget_milestone: <BanknotesIcon className="w-10 h-10 text-blue-500" />,
    timeline_complete: (
      <CheckCircleIcon className="w-10 h-10 text-purple-500" />
    ),
    guest_responses: <UserGroupIcon className="w-10 h-10 text-orange-500" />,
    final_details: <StarIcon className="w-10 h-10 text-yellow-500" />,
    engagement_announcement: <HeartIcon className="w-10 h-10 text-rose-500" />,
    save_the_dates_sent: <GiftIcon className="w-10 h-10 text-pink-500" />,
    invitations_sent: <GiftIcon className="w-10 h-10 text-purple-500" />,
    dress_purchased: <StarIcon className="w-10 h-10 text-rose-400" />,
    catering_booked: <CakeIcon className="w-10 h-10 text-orange-500" />,
    photography_booked: <CameraIcon className="w-10 h-10 text-blue-500" />,
    music_booked: <MusicalNoteIcon className="w-10 h-10 text-green-500" />,
    flowers_ordered: <SparklesIcon className="w-10 h-10 text-pink-500" />,
    honeymoon_planned: <MapPinIcon className="w-10 h-10 text-blue-400" />,
    rehearsal_scheduled: <ClockIcon className="w-10 h-10 text-gray-500" />,
    wedding_party_complete: (
      <UserGroupIcon className="w-10 h-10 text-purple-400" />
    ),
  };

  return (
    iconMap[milestoneType] || <HeartIcon className="w-10 h-10 text-rose-500" />
  );
}

function getAchievementColors(level: string) {
  const colorMap = {
    bronze: { bg: 'bg-amber-100', text: 'text-amber-800' },
    silver: { bg: 'bg-gray-100', text: 'text-gray-800' },
    gold: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    platinum: { bg: 'bg-purple-100', text: 'text-purple-800' },
    diamond: { bg: 'bg-blue-100', text: 'text-blue-800' },
  };

  return colorMap[level as keyof typeof colorMap] || colorMap.bronze;
}

interface ProgressVisualizationProps {
  progress: number;
  total: number;
  type: string;
  label: string;
}

function ProgressVisualization({
  progress,
  total,
  type,
  label,
}: ProgressVisualizationProps) {
  const percentage = (progress / total) * 100;

  if (type === 'circular_progress') {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex items-center justify-center">
        <div className="relative w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r={radius}
              fill="transparent"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            <motion.circle
              cx="25"
              cy="25"
              r={radius}
              fill="transparent"
              stroke="#f43f5e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-rose-600">
            {progress}
          </div>
        </div>
        <span className="ml-3 text-sm text-gray-600">{label}</span>
      </div>
    );
  }

  // Default to progress bar
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-rose-600">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-gradient-to-r from-rose-400 to-pink-400 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

interface ShareableAssetPreviewProps {
  asset: ShareableAsset;
  index: number;
}

function ShareableAssetPreview({ asset, index }: ShareableAssetPreviewProps) {
  return (
    <motion.div
      className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-sm"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.1 }}
    >
      {asset.type === 'image' ? (
        <img
          src={asset.thumbnailUrl}
          alt="Shareable content preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
          <ShareIcon className="w-6 h-6 text-rose-500" />
        </div>
      )}
    </motion.div>
  );
}

function EmptyMilestoneState() {
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
        <SparklesIcon className="w-12 h-12 text-rose-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-3">
        Your First Milestone Awaits! ✨
      </h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        Start your wedding planning journey and watch as beautiful milestones
        appear here to celebrate every step toward your perfect day.
      </p>
      <button className="px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white font-semibold rounded-xl hover:from-rose-500 hover:to-pink-500 transition-all">
        Start Planning 💕
      </button>
    </motion.div>
  );
}

// Milestone Detail Modal (placeholder for now)
interface MilestoneDetailModalProps {
  milestone: MilestoneNotification;
  onClose: () => void;
  onCelebrate: () => void;
  onShare: () => void;
}

function MilestoneDetailModal({
  milestone,
  onClose,
  onCelebrate,
  onShare,
}: MilestoneDetailModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
            {getMilestoneIcon(milestone.milestoneType)}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {milestone.celebrationContent.title}
          </h2>
          <p className="text-gray-600 text-lg">
            {milestone.celebrationContent.celebrationMessage}
          </p>

          <div className="flex gap-4 mt-8">
            <button
              onClick={onCelebrate}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold rounded-xl"
            >
              🎉 Celebrate Again!
            </button>
            <button
              onClick={onShare}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-semibold rounded-xl"
            >
              💫 Share the Joy
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
