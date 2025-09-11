'use client';

import { useState, useEffect, useTransition, useOptimistic } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HeartIcon,
  SparklesIcon,
  GiftIcon,
  CalendarIcon,
  BellIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import {
  PersonalizedNotification,
  MilestoneNotification,
  CoupleProfile,
  WeddingDetails,
  JourneyProgress,
  NotificationAction,
  WeddingContext,
} from '@/types/couple-notifications';

interface CoupleNotificationCenterProps {
  coupleId: string;
  weddingId: string;
  coupleProfile: CoupleProfile;
  weddingDetails: WeddingDetails;
  onNotificationAction: (action: NotificationAction) => void;
}

export function CoupleNotificationCenter({
  coupleId,
  weddingId,
  coupleProfile,
  weddingDetails,
  onNotificationAction,
}: CoupleNotificationCenterProps) {
  const [notifications, setNotifications] = useState<
    PersonalizedNotification[]
  >([]);
  const [milestones, setMilestones] = useState<MilestoneNotification[]>([]);
  const [journeyProgress, setJourneyProgress] =
    useState<JourneyProgress | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'milestones' | 'vendor' | 'planning'
  >('all');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const [optimisticNotifications, addOptimisticUpdate] = useOptimistic(
    notifications,
    (state, updatedNotification: PersonalizedNotification) =>
      state.map((n) =>
        n.notificationId === updatedNotification.notificationId
          ? updatedNotification
          : n,
      ),
  );

  // Calculate days to wedding
  const calculateDaysToWedding = (weddingDate: Date) => {
    return differenceInDays(new Date(weddingDate), new Date());
  };

  // Real-time couple notification stream
  useEffect(() => {
    let coupleNotificationStream: EventSource | null = null;

    const initializeStream = () => {
      try {
        coupleNotificationStream = new EventSource(
          `/api/couples/notifications/stream?coupleId=${coupleId}&weddingId=${weddingId}`,
        );

        coupleNotificationStream.onopen = () => {
          console.log('Couple notification stream connected');
          setIsLoading(false);
        };

        coupleNotificationStream.onmessage = (event) => {
          try {
            const newNotification = JSON.parse(
              event.data,
            ) as PersonalizedNotification;

            // Special handling for milestone notifications
            if (newNotification.type === 'milestone') {
              const milestoneNotification =
                newNotification as MilestoneNotification;
              setMilestones((prev) => [milestoneNotification, ...prev]);
              celebrateMilestone(milestoneNotification);
            } else {
              setNotifications((prev) => [newNotification, ...prev]);
            }

            // Show personalized notification toast
            showPersonalizedNotification(newNotification);
          } catch (error) {
            console.error('Error parsing notification:', error);
          }
        };

        coupleNotificationStream.onerror = (error) => {
          console.error('Notification stream error:', error);
          setIsLoading(false);

          // Retry connection after 5 seconds
          setTimeout(() => {
            if (coupleNotificationStream?.readyState === EventSource.CLOSED) {
              initializeStream();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to initialize notification stream:', error);
        setIsLoading(false);
      }
    };

    initializeStream();

    return () => {
      if (coupleNotificationStream) {
        coupleNotificationStream.close();
      }
    };
  }, [coupleId, weddingId]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load journey progress
        const progressResponse = await fetch(
          `/api/couples/${coupleId}/journey-progress`,
        );
        if (progressResponse.ok) {
          const progress = await progressResponse.json();
          setJourneyProgress(progress);
        }

        // Load existing notifications
        const notificationsResponse = await fetch(
          `/api/couples/${coupleId}/notifications?limit=50`,
        );
        if (notificationsResponse.ok) {
          const existingNotifications = await notificationsResponse.json();
          setNotifications(existingNotifications.notifications || []);
          setMilestones(existingNotifications.milestones || []);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [coupleId]);

  const celebrateMilestone = (milestone: MilestoneNotification) => {
    // Create celebration animation
    const celebration = document.createElement('div');
    celebration.className =
      'fixed inset-0 pointer-events-none z-50 flex items-center justify-center';
    celebration.innerHTML = `
      <div class="text-6xl animate-bounce">
        🎉✨💕
      </div>
    `;
    document.body.appendChild(celebration);

    // Remove after animation
    setTimeout(() => {
      if (document.body.contains(celebration)) {
        document.body.removeChild(celebration);
      }
    }, 3000);

    // Play celebration sound (if supported)
    if ('Audio' in window) {
      try {
        const audio = new Audio('/sounds/milestone-celebration.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch (error) {
        // Silent fail for audio
      }
    }

    // Show special milestone toast
    toast.success(milestone.celebrationContent.title, {
      description: milestone.celebrationContent.celebrationMessage,
      duration: 8000,
      icon: '🎉',
    });
  };

  const showPersonalizedNotification = (
    notification: PersonalizedNotification,
  ) => {
    const emotionalIcons = {
      excited: '🎉',
      romantic: '💕',
      celebratory: '🥳',
      reassuring: '🤗',
      motivational: '✨',
      grateful: '💞',
      nostalgic: '🌹',
      anticipatory: '⏰',
      proud: '🏆',
      loving: '💝',
    };

    const icon = emotionalIcons[notification.emotionalTone] || '💌';
    const duration = notification.priority === 'high' ? 8000 : 5000;

    toast(notification.content.title, {
      description: notification.content.message,
      duration,
      icon,
      action: notification.content.callToAction
        ? {
            label: notification.content.callToAction.label,
            onClick: () => {
              if (notification.content.callToAction?.link) {
                window.open(notification.content.callToAction.link, '_blank');
              }
            },
          }
        : undefined,
    });
  };

  const handleShareNotification = async (notificationId: string) => {
    startTransition(async () => {
      try {
        const notification =
          notifications.find((n) => n.notificationId === notificationId) ||
          milestones.find((m) => m.milestoneId === notificationId);

        if (notification) {
          const response = await fetch(
            '/api/couples/notifications/generate-shareable',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId,
                coupleId,
                weddingId,
              }),
            },
          );

          if (response.ok) {
            const shareableContent = await response.json();
            // Open sharing modal or direct share
            openSharingModal(shareableContent);
          }
        }
      } catch (error) {
        console.error('Error generating shareable content:', error);
        toast.error('Failed to create shareable content. Please try again.');
      }
    });
  };

  const openSharingModal = (shareableContent: any) => {
    // This would open a sharing modal - placeholder for now
    console.log('Opening sharing modal with content:', shareableContent);
  };

  const handleInviteFriends = () => {
    // This would handle friend invitations - placeholder for now
    console.log('Opening friend invitation flow');
  };

  const handleShareJourney = (shareType: string) => {
    // This would handle journey sharing - placeholder for now
    console.log('Sharing journey:', shareType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 mx-auto mb-4"
          >
            <HeartIcon className="w-12 h-12 text-rose-500" />
          </motion.div>
          <p className="text-gray-600">Loading your wedding journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="couple-notification-center max-w-6xl mx-auto p-6 space-y-8">
      {/* Couple Header */}
      <motion.div
        className="couple-header bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="couple-welcome">
            <motion.h1
              className="text-3xl font-bold text-rose-800 mb-2"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Welcome back, {coupleProfile.partnerA.firstName} &{' '}
              {coupleProfile.partnerB.firstName}! 💕
            </motion.h1>
            <p className="text-rose-600 text-lg">
              Your dream wedding is{' '}
              {calculateDaysToWedding(weddingDetails.weddingDate)} days away!
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm text-rose-500">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {format(
                    new Date(weddingDetails.weddingDate),
                    'MMMM do, yyyy',
                  )}
                </span>
              </div>
              {weddingDetails.venueName && (
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  <span>{weddingDetails.venueName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="journey-progress-ring">
            <WeddingJourneyProgressRing
              progress={journeyProgress?.overallProgress || 0}
              milestones={journeyProgress?.completedMilestones || 0}
              totalMilestones={journeyProgress?.totalMilestones || 10}
            />
          </div>
        </div>
      </motion.div>

      {/* Notification Tabs */}
      <div className="notification-tabs">
        <NotificationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            all: notifications.length + milestones.length,
            milestones: milestones.length,
            vendor: notifications.filter((n) => n.category === 'vendor').length,
            planning: notifications.filter((n) => n.category === 'planning')
              .length,
          }}
        />
      </div>

      {/* Notifications Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="notifications-content"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'milestones' && (
            <MilestoneNotificationGrid
              milestones={milestones}
              onCelebrate={celebrateMilestone}
              onShare={handleShareNotification}
            />
          )}

          {activeTab === 'all' && (
            <PersonalizedNotificationFeed
              notifications={[...optimisticNotifications, ...milestones]}
              coupleProfile={coupleProfile}
              onAction={onNotificationAction}
              onShare={handleShareNotification}
              isPending={isPending}
            />
          )}

          {activeTab === 'vendor' && (
            <VendorNotificationSection
              notifications={optimisticNotifications.filter(
                (n) => n.category === 'vendor',
              )}
              vendors={weddingDetails.selectedVendors}
              onAction={onNotificationAction}
            />
          )}

          {activeTab === 'planning' && (
            <PlanningNotificationSection
              notifications={optimisticNotifications.filter(
                (n) => n.category === 'planning',
              )}
              weddingTimeline={weddingDetails.timeline}
              onAction={onNotificationAction}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Viral Growth Features */}
      <ViralGrowthPrompts
        coupleProfile={coupleProfile}
        recentMilestones={milestones.slice(0, 3)}
        onInviteFriends={handleInviteFriends}
        onShareJourney={handleShareJourney}
      />
    </div>
  );
}

// Progress Ring Component
interface WeddingJourneyProgressRingProps {
  progress: number;
  milestones: number;
  totalMilestones: number;
}

function WeddingJourneyProgressRing({
  progress,
  milestones,
  totalMilestones,
}: WeddingJourneyProgressRingProps) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          stroke="#fecaca"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="transparent"
          stroke="#f43f5e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-rose-600">
          {Math.round(progress)}%
        </span>
        <span className="text-xs text-rose-500">
          {milestones}/{totalMilestones} milestones
        </span>
      </div>
    </div>
  );
}

// Notification Tabs Component
interface NotificationTabsProps {
  activeTab: string;
  onTabChange: (tab: 'all' | 'milestones' | 'vendor' | 'planning') => void;
  counts: {
    all: number;
    milestones: number;
    vendor: number;
    planning: number;
  };
}

function NotificationTabs({
  activeTab,
  onTabChange,
  counts,
}: NotificationTabsProps) {
  const tabs = [
    { id: 'all', label: 'All Updates', icon: BellIcon, count: counts.all },
    {
      id: 'milestones',
      label: 'Milestones',
      icon: SparklesIcon,
      count: counts.milestones,
    },
    { id: 'vendor', label: 'Vendors', icon: HeartIcon, count: counts.vendor },
    {
      id: 'planning',
      label: 'Planning',
      icon: CalendarIcon,
      count: counts.planning,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as any)}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
            ${
              activeTab === tab.id
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-gray-600 hover:text-rose-500'
            }
          `}
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span
              className={`
              px-2 py-1 rounded-full text-xs font-bold
              ${
                activeTab === tab.id
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-gray-200 text-gray-600'
              }
            `}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Placeholder components - will be implemented in subsequent tasks
function MilestoneNotificationGrid({ milestones, onCelebrate, onShare }: any) {
  return <div>Milestone Grid - To be implemented</div>;
}

function PersonalizedNotificationFeed({
  notifications,
  coupleProfile,
  onAction,
  onShare,
  isPending,
}: any) {
  return <div>Notification Feed - To be implemented</div>;
}

function VendorNotificationSection({ notifications, vendors, onAction }: any) {
  return <div>Vendor Notifications - To be implemented</div>;
}

function PlanningNotificationSection({
  notifications,
  weddingTimeline,
  onAction,
}: any) {
  return <div>Planning Notifications - To be implemented</div>;
}

function ViralGrowthPrompts({
  coupleProfile,
  recentMilestones,
  onInviteFriends,
  onShareJourney,
}: any) {
  return <div>Viral Growth Prompts - To be implemented</div>;
}

// Additional type definitions for this component
interface WeddingDetails {
  weddingDate: Date;
  venueName?: string;
  selectedVendors: any[];
  timeline: any;
}

interface NotificationAction {
  type: string;
  payload: any;
}
