# WS-334 Team D: WedMe Couple Notification Platform

## Team D Development Prompt

### Overview
Build a beautiful, intelligent notification system for the WedMe couple platform that transforms wedding planning stress into delightful, personalized communication experiences. This system drives viral growth by creating shareable notification moments while providing genuine value to couples planning their dream weddings.

### Wedding-Specific User Stories
1. **Engaged Couple Sarah & James** need personalized notification experience celebrating their wedding journey milestones, vendor confirmations, timeline updates, and planning achievements with romantic, Instagram-worthy messaging and sharable moments
2. **Bride Emma** wants smart notification management during her £40,000 wedding planning process, receiving contextual alerts about vendor communications, budget updates, and timeline changes with AI-powered priority scoring and stress-reducing messaging
3. **Groom David** requires unified notification dashboard coordinating all wedding vendors and family members, with intelligent filtering for payment reminders, vendor updates, and guest communications while maintaining work-life balance
4. **Couple Planning Destination Wedding** needs comprehensive notification system managing international vendors, travel coordination, guest accommodations, and timeline synchronization across multiple time zones with location-aware messaging
5. **Budget-Conscious Couple** wants notification system that helps optimize spending with smart alerts for deals, budget milestone achievements, payment reminders, and cost-saving opportunities while celebrating progress toward their dream wedding

### Core Technical Requirements

#### TypeScript Interfaces
```typescript
interface CoupleNotificationPlatform {
  initializeCoupleExperience(couple: CoupleProfile): Promise<NotificationExperience>;
  generatePersonalizedNotifications(context: CoupleContext): Promise<PersonalizedNotification[]>;
  createMilestoneNotifications(milestones: WeddingMilestone[]): Promise<MilestoneNotification[]>;
  manageCouplePreferences(preferences: CoupleNotificationPreferences): Promise<PreferenceResult>;
  generateShareableContent(notification: CoupleNotification): Promise<ShareableContent>;
}

interface CoupleNotificationExperience {
  experienceId: string;
  coupleId: string;
  weddingId: string;
  personalizationProfile: PersonalizationProfile;
  communicationStyle: CommunicationStyle;
  milestoneTracking: MilestoneTracker;
  viralGrowthFeatures: ViralGrowthFeature[];
  emotionalJourneyMap: EmotionalJourneyMap;
}

interface PersonalizedNotification {
  notificationId: string;
  coupleId: string;
  weddingId: string;
  personalizationLevel: PersonalizationLevel;
  emotionalTone: EmotionalTone;
  visualTheme: VisualTheme;
  content: PersonalizedContent;
  sharingCapabilities: SharingCapability[];
  viralElements: ViralElement[];
  contextualRecommendations: ContextualRecommendation[];
}

interface MilestoneNotification {
  milestoneId: string;
  milestoneType: MilestoneType;
  achievementLevel: AchievementLevel;
  celebrationContent: CelebrationContent;
  progressVisualization: ProgressVisualization;
  shareableAssets: ShareableAsset[];
  friendInvitationPrompts: InvitationPrompt[];
  vendorAppreciationContent: VendorAppreciation[];
}

interface CoupleNotificationPreferences {
  coupleId: string;
  communicationStyle: CommunicationStyle;
  notificationFrequency: NotificationFrequency;
  contentPersonalization: ContentPersonalization;
  privacySettings: CouplePrivacySettings;
  sharingPreferences: SharingPreferences;
  weddingStylePreferences: WeddingStylePreferences;
  partnerCoordination: PartnerCoordination;
}

interface WeddingJourneyOrchestrator {
  trackJourneyProgress(journeyData: WeddingJourneyData): Promise<JourneyProgress>;
  generateJourneyInsights(insights: JourneyInsightRequest): Promise<JourneyInsights>;
  createJourneyMilestones(milestoneConfig: MilestoneConfiguration): Promise<JourneyMilestone[]>;
  optimizeJourneyExperience(optimization: JourneyOptimization): Promise<OptimizationResult>;
  facilitatePartnerSync(partnerSync: PartnerSynchronization): Promise<SyncResult>;
}

interface ViralGrowthEngine {
  generateViralContent(content: NotificationContent): Promise<ViralContent>;
  createSharableMoments(moments: WeddingMoment[]): Promise<SharableMoment[]>;
  facilitateFriendInvitations(invitations: FriendInvitation[]): Promise<InvitationResult>;
  trackViralMetrics(metrics: ViralMetricsRequest): Promise<ViralAnalytics>;
  optimizeViralFeatures(optimization: ViralOptimization): Promise<ViralOptimizationResult>;
}

type MilestoneType = 'venue_booked' | 'vendor_confirmed' | 'budget_milestone' | 'timeline_complete' | 'guest_responses' | 'final_details';
type EmotionalTone = 'excited' | 'romantic' | 'celebratory' | 'reassuring' | 'motivational' | 'grateful';
type PersonalizationLevel = 'basic' | 'enhanced' | 'hyper_personalized' | 'ai_optimized';
type CommunicationStyle = 'formal_elegant' | 'casual_fun' | 'romantic_dreamy' | 'modern_minimal' | 'traditional_classic';
```

#### Personalized Couple Notification Center
```tsx
'use client';

import { useState, useEffect, useTransition, useOptimistic } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, SparklesIcon, GiftIcon, CalendarIcon } from '@heroicons/react/24/outline';

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
  onNotificationAction 
}: CoupleNotificationCenterProps) {
  const [notifications, setNotifications] = useState<PersonalizedNotification[]>([]);
  const [milestones, setMilestones] = useState<MilestoneNotification[]>([]);
  const [journeyProgress, setJourneyProgress] = useState<JourneyProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'milestones' | 'vendor' | 'planning'>('all');
  const [isPending, startTransition] = useTransition();
  const [optimisticNotifications, addOptimisticUpdate] = useOptimistic(
    notifications,
    (state, updatedNotification: PersonalizedNotification) => 
      state.map(n => n.notificationId === updatedNotification.notificationId ? updatedNotification : n)
  );

  // Real-time couple notification stream
  useEffect(() => {
    const coupleNotificationStream = new EventSource(`/api/couples/notifications/stream?coupleId=${coupleId}&weddingId=${weddingId}`);
    
    coupleNotificationStream.onmessage = (event) => {
      const newNotification = JSON.parse(event.data) as PersonalizedNotification;
      
      // Special handling for milestone notifications
      if (newNotification.type === 'milestone') {
        setMilestones(prev => [newNotification as MilestoneNotification, ...prev]);
        celebrateMilestone(newNotification as MilestoneNotification);
      } else {
        setNotifications(prev => [newNotification, ...prev]);
      }

      // Show personalized notification
      showPersonalizedNotification(newNotification);
    };

    return () => coupleNotificationStream.close();
  }, [coupleId, weddingId]);

  // Load journey progress
  useEffect(() => {
    loadWeddingJourneyProgress(weddingId).then(setJourneyProgress);
  }, [weddingId]);

  const celebrateMilestone = (milestone: MilestoneNotification) => {
    // Create celebration animation
    const celebration = document.createElement('div');
    celebration.className = 'milestone-celebration';
    celebration.innerHTML = '🎉✨💕';
    document.body.appendChild(celebration);
    
    // Animate celebration
    setTimeout(() => {
      document.body.removeChild(celebration);
    }, 3000);

    // Play celebration sound
    if ('Audio' in window) {
      const audio = new Audio('/sounds/milestone-celebration.mp3');
      audio.play().catch(() => {}); // Ignore if audio fails
    }
  };

  const showPersonalizedNotification = (notification: PersonalizedNotification) => {
    // Create toast notification with couple's theme
    const toast = {
      id: notification.notificationId,
      title: notification.content.title,
      message: notification.content.message,
      theme: notification.visualTheme,
      emotionalTone: notification.emotionalTone,
      duration: notification.priority === 'high' ? 8000 : 5000
    };

    showToast(toast);
  };

  const handleShareNotification = async (notificationId: string) => {
    startTransition(async () => {
      const notification = notifications.find(n => n.notificationId === notificationId);
      if (notification) {
        const shareableContent = await generateShareableContent(notification);
        openSharingModal(shareableContent);
      }
    });
  };

  return (
    <div className="couple-notification-center">
      <motion.div 
        className="couple-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="couple-welcome">
          <h1 className="text-2xl font-bold text-rose-800">
            Welcome back, {coupleProfile.partnerA.firstName} & {coupleProfile.partnerB.firstName}! 💕
          </h1>
          <p className="text-rose-600">
            Your dream wedding is {calculateDaysToWedding(weddingDetails.weddingDate)} days away!
          </p>
        </div>
        
        <div className="journey-progress-ring">
          <WeddingJourneyProgressRing
            progress={journeyProgress?.overallProgress || 0}
            milestones={journeyProgress?.completedMilestones || 0}
            totalMilestones={journeyProgress?.totalMilestones || 10}
          />
        </div>
      </motion.div>

      <div className="notification-tabs">
        <NotificationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            all: notifications.length,
            milestones: milestones.length,
            vendor: notifications.filter(n => n.category === 'vendor').length,
            planning: notifications.filter(n => n.category === 'planning').length
          }}
        />
      </div>

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
              notifications={optimisticNotifications}
              coupleProfile={coupleProfile}
              onAction={onNotificationAction}
              onShare={handleShareNotification}
              isPending={isPending}
            />
          )}
          
          {activeTab === 'vendor' && (
            <VendorNotificationSection
              notifications={optimisticNotifications.filter(n => n.category === 'vendor')}
              vendors={weddingDetails.selectedVendors}
              onAction={onNotificationAction}
            />
          )}
          
          {activeTab === 'planning' && (
            <PlanningNotificationSection
              notifications={optimisticNotifications.filter(n => n.category === 'planning')}
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
```

### Milestone Celebration System

#### Interactive Milestone Notifications
```tsx
interface MilestoneNotificationGridProps {
  milestones: MilestoneNotification[];
  onCelebrate: (milestone: MilestoneNotification) => void;
  onShare: (milestoneId: string) => void;
}

function MilestoneNotificationGrid({ milestones, onCelebrate, onShare }: MilestoneNotificationGridProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneNotification | null>(null);

  return (
    <div className="milestone-grid">
      <div className="milestone-header">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🎉 Your Wedding Journey Milestones</h2>
        <p className="text-gray-600 mb-6">Celebrating every step toward your perfect day!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.map((milestone, index) => (
          <motion.div
            key={milestone.milestoneId}
            className="milestone-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
          >
            <div className="milestone-visual">
              <motion.div 
                className="milestone-icon"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2,
                  repeatDelay: 5 
                }}
              >
                {getMilestoneIcon(milestone.milestoneType)}
              </motion.div>
              
              <div className="achievement-badge">
                <span className={`badge ${milestone.achievementLevel}`}>
                  {milestone.achievementLevel.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="milestone-content">
              <h3 className="milestone-title">{milestone.celebrationContent.title}</h3>
              <p className="milestone-description">{milestone.celebrationContent.description}</p>
              
              {milestone.progressVisualization && (
                <div className="progress-visualization">
                  <ProgressVisualization
                    progress={milestone.progressVisualization.currentProgress}
                    total={milestone.progressVisualization.totalSteps}
                    type={milestone.progressVisualization.visualType}
                  />
                </div>
              )}
            </div>

            <div className="milestone-actions">
              <button
                className="celebrate-button"
                onClick={() => onCelebrate(milestone)}
              >
                <SparklesIcon className="w-5 h-5" />
                Celebrate!
              </button>
              
              <button
                className="share-button"
                onClick={() => onShare(milestone.milestoneId)}
              >
                <ShareIcon className="w-5 h-5" />
                Share Joy
              </button>
            </div>

            {milestone.shareableAssets && milestone.shareableAssets.length > 0 && (
              <div className="shareable-preview">
                <ShareableAssetPreview assets={milestone.shareableAssets.slice(0, 3)} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {milestones.length === 0 && (
        <EmptyMilestoneState />
      )}
    </div>
  );
}

function getMilestoneIcon(milestoneType: MilestoneType): JSX.Element {
  const iconMap = {
    venue_booked: <BuildingOffice2Icon className="w-8 h-8 text-rose-500" />,
    vendor_confirmed: <HandshakeIcon className="w-8 h-8 text-green-500" />,
    budget_milestone: <BanknotesIcon className="w-8 h-8 text-blue-500" />,
    timeline_complete: <CheckCircleIcon className="w-8 h-8 text-purple-500" />,
    guest_responses: <UserGroupIcon className="w-8 h-8 text-orange-500" />,
    final_details: <StarIcon className="w-8 h-8 text-yellow-500" />
  };
  
  return iconMap[milestoneType] || <HeartIcon className="w-8 h-8 text-rose-500" />;
}
```

### Personalized Communication Engine

#### AI-Powered Personalization
```tsx
class CouplePersonalizationEngine {
  private personalityAnalyzer: PersonalityAnalyzer;
  private contentGenerator: PersonalizedContentGenerator;
  private emotionalToneDetector: EmotionalToneDetector;
  private viralContentCreator: ViralContentCreator;

  constructor() {
    this.personalityAnalyzer = new PersonalityAnalyzer();
    this.contentGenerator = new PersonalizedContentGenerator();
    this.emotionalToneDetector = new EmotionalToneDetector();
    this.viralContentCreator = new ViralContentCreator();
  }

  async generatePersonalizedNotification(
    baseNotification: BaseNotification,
    coupleProfile: CoupleProfile,
    weddingContext: WeddingContext
  ): Promise<PersonalizedNotification> {
    // Analyze couple's communication preferences
    const personalityInsights = await this.personalityAnalyzer.analyzeCouplePersonality(coupleProfile);
    
    // Determine optimal emotional tone
    const emotionalTone = await this.emotionalToneDetector.detectOptimalTone(
      baseNotification,
      personalityInsights,
      weddingContext.currentStressLevel
    );

    // Generate personalized content
    const personalizedContent = await this.contentGenerator.generateContent({
      baseNotification,
      coupleProfile,
      personalityInsights,
      emotionalTone,
      weddingContext
    });

    // Create viral elements
    const viralElements = await this.viralContentCreator.createViralElements(
      personalizedContent,
      coupleProfile.viralTendencies
    );

    // Generate shareable assets
    const shareableAssets = await this.generateShareableAssets(
      personalizedContent,
      coupleProfile.visualPreferences
    );

    return {
      notificationId: `personalized-${baseNotification.id}-${Date.now()}`,
      coupleId: coupleProfile.coupleId,
      weddingId: weddingContext.weddingId,
      personalizationLevel: 'ai_optimized',
      emotionalTone,
      visualTheme: this.selectVisualTheme(personalityInsights, coupleProfile),
      content: personalizedContent,
      sharingCapabilities: this.determineSharingCapabilities(coupleProfile),
      viralElements,
      contextualRecommendations: await this.generateContextualRecommendations(
        baseNotification,
        weddingContext
      )
    };
  }

  private async generatePersonalizedTitle(
    baseTitle: string,
    coupleProfile: CoupleProfile,
    emotionalTone: EmotionalTone
  ): Promise<string> {
    const templates = {
      excited: [
        `🎉 Amazing news, ${coupleProfile.partnerA.firstName} & ${coupleProfile.partnerB.firstName}!`,
        `✨ Something wonderful just happened for your wedding!`,
        `🥳 Get ready to celebrate - great news incoming!`
      ],
      romantic: [
        `💕 A beautiful moment in your love story...`,
        `🌹 Something magical for your special day...`,
        `💞 Your wedding dreams are coming true...`
      ],
      celebratory: [
        `🎊 Milestone achieved! Time to celebrate!`,
        `🏆 You've reached another wedding planning victory!`,
        `🎈 Pop the champagne - you've done something amazing!`
      ],
      reassuring: [
        `🤗 Everything is coming together perfectly...`,
        `✅ One more thing checked off your list!`,
        `😌 You're doing great - here's an update...`
      ]
    };

    const toneTemplates = templates[emotionalTone] || templates.excited;
    const selectedTemplate = toneTemplates[Math.floor(Math.random() * toneTemplates.length)];
    
    return selectedTemplate;
  }

  private async generatePersonalizedMessage(
    baseMessage: string,
    coupleProfile: CoupleProfile,
    weddingContext: WeddingContext,
    emotionalTone: EmotionalTone
  ): Promise<string> {
    const personalizations = {
      couple_names: `${coupleProfile.partnerA.firstName} and ${coupleProfile.partnerB.firstName}`,
      wedding_date: format(new Date(weddingContext.weddingDate), 'MMMM do, yyyy'),
      days_to_wedding: calculateDaysToWedding(weddingContext.weddingDate),
      venue_name: weddingContext.venueName || 'your chosen venue',
      wedding_style: coupleProfile.weddingStyle || 'perfect'
    };

    let personalizedMessage = baseMessage;
    
    // Apply personalization tokens
    Object.entries(personalizations).forEach(([token, value]) => {
      personalizedMessage = personalizedMessage.replace(
        new RegExp(`{{${token}}}`, 'g'),
        value.toString()
      );
    });

    // Add emotional flourishes based on tone
    const flourishes = {
      excited: ['🎉', '✨', '💫', '🌟'],
      romantic: ['💕', '💞', '🌹', '💝'],
      celebratory: ['🎊', '🥳', '🎈', '🎁'],
      reassuring: ['🤗', '💚', '✨', '🌈']
    };

    const toneFlourishes = flourishes[emotionalTone] || flourishes.excited;
    const selectedFlourish = toneFlourishes[Math.floor(Math.random() * toneFlourishes.length)];
    
    personalizedMessage += ` ${selectedFlourish}`;

    return personalizedMessage;
  }

  async generateContextualRecommendations(
    baseNotification: BaseNotification,
    weddingContext: WeddingContext
  ): Promise<ContextualRecommendation[]> {
    const recommendations = [];

    // Budget-based recommendations
    if (baseNotification.category === 'budget') {
      if (weddingContext.budgetUtilization < 0.7) {
        recommendations.push({
          type: 'budget_optimization',
          title: '💡 Smart Spending Tip',
          description: 'You\'re under budget! Consider upgrading your photography package or adding special touches.',
          action: {
            label: 'Explore Upgrades',
            link: '/budget/optimization'
          }
        });
      }
    }

    // Timeline-based recommendations
    if (baseNotification.category === 'timeline' && weddingContext.daysToWedding <= 30) {
      recommendations.push({
        type: 'timeline_optimization',
        title: '⏰ Final Month Checklist',
        description: 'You\'re in the final stretch! Here are the most important tasks to focus on.',
        action: {
          label: 'View Checklist',
          link: '/timeline/final-month'
        }
      });
    }

    // Vendor-based recommendations
    if (baseNotification.category === 'vendor') {
      const incompleteCategories = weddingContext.vendorCategories.filter(c => !c.confirmed);
      if (incompleteCategories.length > 0) {
        recommendations.push({
          type: 'vendor_completion',
          title: '📋 Vendor Checklist',
          description: `You still need to book: ${incompleteCategories.slice(0, 2).map(c => c.name).join(', ')}`,
          action: {
            label: 'Find Vendors',
            link: '/vendors/marketplace'
          }
        });
      }
    }

    return recommendations;
  }
}
```

### Viral Growth Features

#### Friend Invitation & Sharing System
```tsx
interface ViralGrowthPromptsProps {
  coupleProfile: CoupleProfile;
  recentMilestones: MilestoneNotification[];
  onInviteFriends: (invitationType: InvitationType) => void;
  onShareJourney: (shareType: ShareType) => void;
}

function ViralGrowthPrompts({ 
  coupleProfile, 
  recentMilestones, 
  onInviteFriends, 
  onShareJourney 
}: ViralGrowthPromptsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [shareableContent, setShareableContent] = useState<ShareableContent[]>([]);

  useEffect(() => {
    generateViralShareableContent(coupleProfile, recentMilestones).then(setShareableContent);
  }, [coupleProfile, recentMilestones]);

  return (
    <div className="viral-growth-section">
      <motion.div
        className="growth-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          ✨ Share Your Wedding Joy
        </h3>
        <p className="text-gray-600 mb-4">
          Let your friends and family be part of your journey!
        </p>
      </motion.div>

      <div className="growth-actions">
        <motion.div
          className="invite-friends-card"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="card-content">
            <div className="card-icon">
              <UserPlusIcon className="w-8 h-8 text-blue-500" />
            </div>
            <div className="card-text">
              <h4 className="font-semibold text-gray-800">Invite Friends to WedMe</h4>
              <p className="text-sm text-gray-600">
                Let your loved ones follow your wedding planning journey
              </p>
            </div>
          </div>
          <button
            className="invite-button"
            onClick={() => setShowInviteModal(true)}
          >
            Invite Friends
          </button>
        </motion.div>

        <div className="shareable-content-grid">
          {shareableContent.slice(0, 3).map(content => (
            <ShareableContentCard
              key={content.contentId}
              content={content}
              onShare={(platform) => shareToSocialPlatform(content, platform)}
            />
          ))}
        </div>

        <div className="journey-sharing-options">
          <h4 className="font-medium text-gray-800 mb-3">Share Your Story</h4>
          <div className="sharing-buttons">
            <SocialShareButton
              platform="instagram"
              content="Check out our wedding planning progress! 💕"
              onClick={() => onShareJourney('instagram_story')}
              color="bg-gradient-to-r from-purple-500 to-pink-500"
            />
            <SocialShareButton
              platform="facebook"
              content="Exciting wedding planning updates!"
              onClick={() => onShareJourney('facebook_post')}
              color="bg-blue-600"
            />
            <SocialShareButton
              platform="twitter"
              content="Wedding planning milestone achieved! ✨"
              onClick={() => onShareJourney('twitter_post')}
              color="bg-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Friend Invitation Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <FriendInvitationModal
            coupleProfile={coupleProfile}
            onClose={() => setShowInviteModal(false)}
            onInvite={handleFriendInvitation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface FriendInvitationModalProps {
  coupleProfile: CoupleProfile;
  onClose: () => void;
  onInvite: (invitationData: FriendInvitationData) => void;
}

function FriendInvitationModal({ coupleProfile, onClose, onInvite }: FriendInvitationModalProps) {
  const [invitationMethod, setInvitationMethod] = useState<'email' | 'sms' | 'link'>('email');
  const [friendContacts, setFriendContacts] = useState<FriendContact[]>([]);
  const [personalMessage, setPersonalMessage] = useState('');

  const defaultMessage = `Hi! ${coupleProfile.partnerA.firstName} and ${coupleProfile.partnerB.firstName} are getting married and we'd love for you to follow our wedding planning journey on WedMe! 💕`;

  return (
    <motion.div
      className="invitation-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="invitation-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-xl font-bold text-gray-800">
            Invite Friends to Your Wedding Journey
          </h3>
          <button onClick={onClose} className="close-button">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="modal-content">
          <div className="invitation-preview">
            <h4 className="font-medium mb-2">Preview:</h4>
            <div className="preview-card">
              <div className="couple-info">
                <img 
                  src={coupleProfile.couplePhoto || '/default-couple-avatar.png'} 
                  alt="Couple" 
                  className="couple-avatar"
                />
                <div>
                  <p className="font-medium">
                    {coupleProfile.partnerA.firstName} & {coupleProfile.partnerB.firstName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Getting married {format(new Date(coupleProfile.weddingDate), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <p className="invitation-text">
                {personalMessage || defaultMessage}
              </p>
            </div>
          </div>

          <div className="invitation-methods">
            <div className="method-selector">
              <button
                className={`method-button ${invitationMethod === 'email' ? 'active' : ''}`}
                onClick={() => setInvitationMethod('email')}
              >
                <EnvelopeIcon className="w-5 h-5" />
                Email
              </button>
              <button
                className={`method-button ${invitationMethod === 'sms' ? 'active' : ''}`}
                onClick={() => setInvitationMethod('sms')}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                Text
              </button>
              <button
                className={`method-button ${invitationMethod === 'link' ? 'active' : ''}`}
                onClick={() => setInvitationMethod('link')}
              >
                <LinkIcon className="w-5 h-5" />
                Share Link
              </button>
            </div>

            {invitationMethod !== 'link' && (
              <div className="contact-input">
                <FriendContactInput
                  method={invitationMethod}
                  contacts={friendContacts}
                  onContactsChange={setFriendContacts}
                />
              </div>
            )}

            <div className="message-input">
              <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={defaultMessage}
                className="w-full p-3 border rounded-lg resize-none"
                rows={3}
                maxLength={280}
              />
              <p className="text-xs text-gray-500 mt-1">
                {personalMessage.length}/280 characters
              </p>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={() => {
              onInvite({
                method: invitationMethod,
                contacts: friendContacts,
                message: personalMessage || defaultMessage,
                coupleProfile
              });
              onClose();
            }}
            className="send-invites-button"
          >
            {invitationMethod === 'link' ? 'Generate Link' : `Send ${friendContacts.length} Invitation${friendContacts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

### Evidence of Reality Requirements

#### File Structure Evidence
```
src/
├── components/
│   ├── couples/
│   │   ├── notifications/
│   │   │   ├── CoupleNotificationCenter.tsx ✓
│   │   │   ├── PersonalizedNotificationFeed.tsx ✓
│   │   │   ├── MilestoneNotificationGrid.tsx ✓
│   │   │   └── ViralGrowthPrompts.tsx ✓
│   │   ├── personalization/
│   │   │   ├── CouplePersonalizationEngine.tsx ✓
│   │   │   └── PersonalizedContentGenerator.tsx ✓
│   │   └── sharing/
│   │       ├── FriendInvitationModal.tsx ✓
│   │       ├── ShareableContentCard.tsx ✓
│   │       └── SocialShareButton.tsx ✓
├── services/
│   ├── couples/
│   │   ├── CoupleNotificationService.ts ✓
│   │   ├── PersonalizationEngine.ts ✓
│   │   └── ViralGrowthService.ts ✓
├── lib/
│   ├── couples/
│   │   ├── milestone-tracking.ts ✓
│   │   ├── journey-orchestration.ts ✓
│   │   └── viral-content-generation.ts ✓
└── types/
    ├── couple-notifications.ts ✓
    └── viral-growth.ts ✓
```

#### Performance Benchmarks
```bash
# Couple notification performance
npm run test:couple-notifications
✓ Personalized notification generation <1s
✓ Milestone celebration animations smooth 60fps
✓ Real-time notification stream <100ms latency
✓ Viral content generation <2s
✓ Mobile experience optimized

# Viral growth metrics testing
npm run test:viral-growth
✓ Friend invitation flow conversion >15%
✓ Social sharing engagement >8% CTR
✓ Milestone celebration sharing >25%
✓ Content personalization accuracy >90%
```

#### Wedding Context Testing
```typescript
describe('CoupleNotificationPlatform', () => {
  it('personalizes notifications based on couple personality', async () => {
    const coupleProfile = createCoupleProfile();
    const baseNotification = createBaseNotification();
    const personalized = await personalizationEngine.generatePersonalizedNotification(baseNotification, coupleProfile, weddingContext);
    expect(personalized.emotionalTone).toBe(coupleProfile.preferredTone);
    expect(personalized.personalizedContent).toContain(coupleProfile.partnerA.firstName);
  });

  it('creates milestone celebrations with viral elements', async () => {
    const milestone = createMilestoneNotification();
    const viralContent = await viralEngine.generateViralContent(milestone);
    expect(viralContent.shareableAssets.length).toBeGreaterThan(0);
    expect(viralContent.friendInvitationPrompts).toBeDefined();
  });

  it('optimizes notification timing based on couple behavior', async () => {
    const coupleProfile = createCoupleWithBehaviorData();
    const optimizedTiming = await optimizeNotificationTiming(coupleProfile);
    expect(optimizedTiming.preferredHours).toHaveLength(2);
  });
});
```

### Performance Targets
- **Personalization Speed**: AI-personalized notifications generated <1s
- **Real-time Updates**: Couple notification stream <100ms latency
- **Mobile Experience**: Touch interactions respond <50ms
- **Viral Content Generation**: Shareable content created <2s
- **Milestone Celebrations**: Smooth 60fps animation performance
- **Friend Invitations**: Invitation flow completion <30s
- **Social Sharing**: Share action completes <3s

### Viral Growth Metrics
- **Friend Invitation Rate**: >15% of couples invite friends monthly
- **Social Sharing Engagement**: >8% click-through rate on shared content
- **Milestone Celebration Sharing**: >25% of milestones shared publicly
- **Friend Conversion Rate**: >12% of invited friends become active users
- **Content Virality Score**: 1.8+ viral coefficient on shared content
- **User-Generated Content**: >30% of couples create custom shareable content

### Business Success Metrics
- **Couple Engagement**: >85% daily active couple users
- **Notification Open Rate**: >78% within 1 hour of delivery
- **Satisfaction Score**: >4.9/5 for notification usefulness
- **Stress Reduction**: 40% decrease in wedding planning anxiety (measured via surveys)
- **Platform Loyalty**: >90% of couples complete their entire journey on WedMe
- **Organic Growth**: 60% of new couples come from friend referrals
- **Revenue Impact**: Viral features drive 45% of WedSync supplier discovery

This comprehensive couple notification platform transforms wedding planning stress into joyful, shareable experiences that drive viral growth while providing genuine value throughout the entire wedding journey.