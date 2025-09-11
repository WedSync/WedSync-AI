'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlusIcon,
  ShareIcon,
  HeartIcon,
  SparklesIcon,
  GiftIcon,
  LinkIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ClipboardIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  CoupleProfile,
  MilestoneNotification,
  ShareableContent,
  FriendInvitation,
  InvitationType,
  ShareType,
  SocialPlatform,
} from '@/types/couple-notifications';

interface ViralGrowthPromptsProps {
  coupleProfile: CoupleProfile;
  recentMilestones: MilestoneNotification[];
  onInviteFriends: (invitationType: InvitationType) => void;
  onShareJourney: (shareType: ShareType) => void;
}

export function ViralGrowthPrompts({
  coupleProfile,
  recentMilestones,
  onInviteFriends,
  onShareJourney,
}: ViralGrowthPromptsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [shareableContent, setShareableContent] = useState<ShareableContent[]>(
    [],
  );
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [invitationsSent, setInvitationsSent] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Generate viral shareable content
  useEffect(() => {
    const generateContent = async () => {
      if (recentMilestones.length === 0) return;

      setIsGeneratingContent(true);
      try {
        const response = await fetch('/api/couples/viral/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupleProfile,
            milestones: recentMilestones.slice(0, 3),
            contentTypes: [
              'milestone_card',
              'progress_infographic',
              'couple_story',
            ],
          }),
        });

        if (response.ok) {
          const content = await response.json();
          setShareableContent(content.shareableContent || []);
        }
      } catch (error) {
        console.error('Error generating shareable content:', error);
      } finally {
        setIsGeneratingContent(false);
      }
    };

    generateContent();
  }, [coupleProfile, recentMilestones]);

  const handleInviteFriends = () => {
    setShowInviteModal(true);
  };

  const handleFriendInvitation = async (
    invitationData: FriendInvitationData,
  ) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/couples/viral/send-invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invitationData),
        });

        if (response.ok) {
          const result = await response.json();
          setInvitationsSent((prev) => prev + result.sent);
          toast.success(
            `🎉 Sent ${result.sent} invitation${result.sent !== 1 ? 's' : ''}!`,
            {
              description:
                'Your friends will love following your wedding journey!',
            },
          );
          onInviteFriends(invitationData.method);
        } else {
          throw new Error('Failed to send invitations');
        }
      } catch (error) {
        console.error('Error sending invitations:', error);
        toast.error('Failed to send invitations. Please try again.');
      }
    });
  };

  const shareToSocialPlatform = async (
    content: ShareableContent,
    platform: SocialPlatform,
  ) => {
    try {
      const response = await fetch('/api/couples/viral/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.contentId,
          platform,
          coupleId: coupleProfile.coupleId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.shareUrl) {
          window.open(result.shareUrl, '_blank', 'width=600,height=400');
          onShareJourney(`${platform}_post` as ShareType);

          toast.success(`Shared to ${platform}! 🎉`, {
            description: 'Your friends will love seeing your wedding journey!',
          });
        }
      }
    } catch (error) {
      console.error('Error sharing to platform:', error);
      toast.error(`Failed to share to ${platform}. Please try again.`);
    }
  };

  const calculateViralScore = () => {
    const baseScore = invitationsSent * 10;
    const milestoneBonus = recentMilestones.length * 5;
    const engagementBonus = shareableContent.length * 3;
    return baseScore + milestoneBonus + engagementBonus;
  };

  return (
    <div className="viral-growth-section bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 space-y-8">
      {/* Header */}
      <motion.div
        className="growth-header text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <SparklesIcon className="w-8 h-8 text-purple-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-800">
            ✨ Share Your Wedding Joy
          </h3>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              delay: 1,
            }}
          >
            <HeartIcon className="w-8 h-8 text-pink-500" />
          </motion.div>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Let your friends and family be part of your magical journey! Share
          your milestones and invite loved ones to follow along. 💕
        </p>

        {/* Viral Score Display */}
        {invitationsSent > 0 && (
          <motion.div
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <GiftIcon className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-700">
              Viral Score: {calculateViralScore()} points! 🎉
            </span>
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Friend Invitation Section */}
        <motion.div
          className="invite-friends-section"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FriendInvitationCard
            coupleProfile={coupleProfile}
            invitationsSent={invitationsSent}
            onInvite={handleInviteFriends}
            isLoading={isPending}
          />
        </motion.div>

        {/* Shareable Content Section */}
        <motion.div
          className="shareable-content-section"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ShareableContentGrid
            content={shareableContent}
            isGenerating={isGeneratingContent}
            onShare={shareToSocialPlatform}
            coupleProfile={coupleProfile}
          />
        </motion.div>
      </div>

      {/* Social Sharing Options */}
      <motion.div
        className="journey-sharing-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <JourneySharingOptions
          coupleProfile={coupleProfile}
          recentMilestones={recentMilestones}
          onShareJourney={onShareJourney}
        />
      </motion.div>

      {/* Friend Invitation Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <FriendInvitationModal
            coupleProfile={coupleProfile}
            onClose={() => setShowInviteModal(false)}
            onInvite={handleFriendInvitation}
            isLoading={isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Friend Invitation Card Component
interface FriendInvitationCardProps {
  coupleProfile: CoupleProfile;
  invitationsSent: number;
  onInvite: () => void;
  isLoading: boolean;
}

function FriendInvitationCard({
  coupleProfile,
  invitationsSent,
  onInvite,
  isLoading,
}: FriendInvitationCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
          <UserPlusIcon className="w-8 h-8 text-blue-600" />
        </div>

        <div>
          <h4 className="text-xl font-bold text-gray-800 mb-2">
            Invite Friends to Your Journey
          </h4>
          <p className="text-gray-600">
            Let your loved ones follow your wedding planning adventure and
            celebrate every milestone with you!
          </p>
        </div>

        {invitationsSent > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckIcon className="w-5 h-5" />
              <span className="font-semibold">
                {invitationsSent} friend{invitationsSent !== 1 ? 's' : ''}{' '}
                invited! 🎉
              </span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              They'll receive beautiful updates about your wedding journey
            </p>
          </div>
        )}

        <motion.button
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onInvite}
          disabled={isLoading}
          whileHover={!isLoading ? { scale: 1.02 } : {}}
          whileTap={!isLoading ? { scale: 0.98 } : {}}
        >
          <div className="flex items-center justify-center gap-3">
            {isLoading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <UserPlusIcon className="w-6 h-6" />
            )}
            <span>{isLoading ? 'Sending Invites...' : 'Invite Friends'}</span>
          </div>
        </motion.button>

        <div className="text-sm text-gray-500 space-y-1">
          <p>✨ Friends get exclusive vendor discounts</p>
          <p>💕 Beautiful milestone notifications</p>
          <p>🎁 Early access to new WedMe features</p>
        </div>
      </div>
    </div>
  );
}

// Shareable Content Grid Component
interface ShareableContentGridProps {
  content: ShareableContent[];
  isGenerating: boolean;
  onShare: (content: ShareableContent, platform: SocialPlatform) => void;
  coupleProfile: CoupleProfile;
}

function ShareableContentGrid({
  content,
  isGenerating,
  onShare,
  coupleProfile,
}: ShareableContentGridProps) {
  if (isGenerating) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="text-center space-y-4">
          <motion.div
            className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <SparklesIcon className="w-8 h-8 text-rose-500" />
          </motion.div>
          <div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">
              Creating Your Content ✨
            </h4>
            <p className="text-gray-600">
              We're generating beautiful, personalized content for you to
              share...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-bold text-gray-800 mb-2">
            Ready to Share 📸
          </h4>
          <p className="text-gray-600">
            Beautiful content personalized just for you
          </p>
        </div>

        {content.length > 0 ? (
          <div className="space-y-4">
            {content.slice(0, 3).map((contentItem) => (
              <ShareableContentCard
                key={contentItem.contentId}
                content={contentItem}
                onShare={(platform) => onShare(contentItem, platform)}
              />
            ))}
          </div>
        ) : (
          <EmptyContentState coupleProfile={coupleProfile} />
        )}
      </div>
    </div>
  );
}

// Shareable Content Card Component
interface ShareableContentCardProps {
  content: ShareableContent;
  onShare: (platform: SocialPlatform) => void;
}

function ShareableContentCard({ content, onShare }: ShareableContentCardProps) {
  return (
    <motion.div
      className="border border-gray-200 rounded-xl p-4 hover:border-rose-300 transition-colors"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg overflow-hidden">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShareIcon className="w-8 h-8 text-rose-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-gray-800 truncate">
            {content.title}
          </h5>
          <p className="text-sm text-gray-600 line-clamp-2">
            {content.description}
          </p>

          <div className="flex gap-2 mt-3">
            {content.socialMediaFormats?.slice(0, 3).map((platform, index) => (
              <motion.button
                key={platform.platform}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${getSocialPlatformStyle(platform.platform)}`}
                onClick={() => onShare(platform.platform)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {platform.platform}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Journey Sharing Options Component
interface JourneySharingOptionsProps {
  coupleProfile: CoupleProfile;
  recentMilestones: MilestoneNotification[];
  onShareJourney: (shareType: ShareType) => void;
}

function JourneySharingOptions({
  coupleProfile,
  recentMilestones,
  onShareJourney,
}: JourneySharingOptionsProps) {
  const journeyHighlights = [
    `${coupleProfile.partnerA.firstName} & ${coupleProfile.partnerB.firstName} are planning their dream wedding! 💕`,
    `Wedding planning progress: ${recentMilestones.length} milestones achieved! 🎉`,
    `Getting married on ${format(new Date(coupleProfile.weddingDate), 'MMMM do, yyyy')} ✨`,
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="text-center space-y-6">
        <div>
          <h4 className="text-xl font-bold text-gray-800 mb-2">
            Share Your Story 📖
          </h4>
          <p className="text-gray-600">
            Let the world celebrate your love story
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SocialShareButton
            platform="instagram"
            content={journeyHighlights[0]}
            onClick={() => onShareJourney('instagram_story')}
            color="bg-gradient-to-r from-purple-500 to-pink-500"
            icon="📸"
          />
          <SocialShareButton
            platform="facebook"
            content={journeyHighlights[1]}
            onClick={() => onShareJourney('facebook_post')}
            color="bg-blue-600"
            icon="👥"
          />
          <SocialShareButton
            platform="twitter"
            content={journeyHighlights[2]}
            onClick={() => onShareJourney('twitter_post')}
            color="bg-sky-500"
            icon="🐦"
          />
        </div>

        {recentMilestones.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
              <SparklesIcon className="w-5 h-5" />
              <span className="font-semibold">Latest Achievement</span>
            </div>
            <p className="text-sm text-orange-600">
              {recentMilestones[0]?.celebrationContent?.title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Social Share Button Component
interface SocialShareButtonProps {
  platform: string;
  content: string;
  onClick: () => void;
  color: string;
  icon: string;
}

function SocialShareButton({
  platform,
  content,
  onClick,
  color,
  icon,
}: SocialShareButtonProps) {
  return (
    <motion.button
      className={`${color} text-white p-4 rounded-xl font-semibold text-sm transition-all hover:shadow-lg`}
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="space-y-2">
        <div className="text-2xl">{icon}</div>
        <div className="capitalize font-bold">{platform}</div>
        <div className="text-xs opacity-90 line-clamp-2">{content}</div>
      </div>
    </motion.button>
  );
}

// Empty Content State Component
function EmptyContentState({
  coupleProfile,
}: {
  coupleProfile: CoupleProfile;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
        <SparklesIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h5 className="font-semibold text-gray-700 mb-2">
        Content Coming Soon! ✨
      </h5>
      <p className="text-sm text-gray-500">
        Complete more milestones to unlock beautiful shareable content
      </p>
    </div>
  );
}

// Friend Invitation Modal (simplified - full implementation would be extensive)
interface FriendInvitationModalProps {
  coupleProfile: CoupleProfile;
  onClose: () => void;
  onInvite: (invitationData: FriendInvitationData) => void;
  isLoading: boolean;
}

function FriendInvitationModal({
  coupleProfile,
  onClose,
  onInvite,
  isLoading,
}: FriendInvitationModalProps) {
  const [invitationMethod, setInvitationMethod] = useState<
    'email' | 'sms' | 'link'
  >('email');
  const [friendContacts, setFriendContacts] = useState<FriendContact[]>([]);
  const [personalMessage, setPersonalMessage] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const defaultMessage = `Hi! ${coupleProfile.partnerA.firstName} and ${coupleProfile.partnerB.firstName} are getting married and we'd love for you to follow our wedding planning journey on WedMe! 💕`;

  useEffect(() => {
    // Generate shareable link
    const generateLink = async () => {
      try {
        const response = await fetch(
          '/api/couples/viral/generate-invite-link',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupleId: coupleProfile.coupleId }),
          },
        );
        if (response.ok) {
          const result = await response.json();
          setShareableLink(result.shareableLink);
        }
      } catch (error) {
        console.error('Error generating shareable link:', error);
      }
    };

    generateLink();
  }, [coupleProfile.coupleId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setLinkCopied(true);
      toast.success('Link copied! 📋');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-800">
              Invite Friends to Your Wedding Journey
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-6">
            <h4 className="font-semibold mb-3">Preview:</h4>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                {coupleProfile.couplePhoto ? (
                  <img
                    src={coupleProfile.couplePhoto}
                    alt="Couple"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                    <HeartIcon className="w-6 h-6 text-rose-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800">
                    {coupleProfile.partnerA.firstName} &{' '}
                    {coupleProfile.partnerB.firstName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Getting married{' '}
                    {format(new Date(coupleProfile.weddingDate), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <p className="text-gray-700">
                {personalMessage || defaultMessage}
              </p>
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { id: 'email', icon: EnvelopeIcon, label: 'Email' },
                { id: 'sms', icon: ChatBubbleLeftRightIcon, label: 'Text' },
                { id: 'link', icon: LinkIcon, label: 'Share Link' },
              ].map((method) => (
                <button
                  key={method.id}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                    invitationMethod === method.id
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  onClick={() => setInvitationMethod(method.id as any)}
                >
                  <method.icon className="w-5 h-5" />
                  {method.label}
                </button>
              ))}
            </div>

            {invitationMethod === 'link' ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    {linkCopied ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <ClipboardIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {invitationMethod === 'email'
                    ? 'Email Addresses'
                    : 'Phone Numbers'}
                </label>
                <textarea
                  placeholder={`Enter ${invitationMethod === 'email' ? 'email addresses' : 'phone numbers'} separated by commas`}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                  onChange={(e) => {
                    const contacts = e.target.value
                      .split(',')
                      .map((contact) => ({
                        id: Date.now() + Math.random(),
                        [invitationMethod]: contact.trim(),
                      }))
                      .filter((contact) => contact[invitationMethod]);
                    setFriendContacts(contacts as any);
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Personal Message (Optional)
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={defaultMessage}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
                maxLength={280}
              />
              <p className="text-xs text-gray-500">
                {personalMessage.length}/280 characters
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (invitationMethod === 'link') {
                  copyLink();
                  onClose();
                } else {
                  onInvite({
                    method: invitationMethod,
                    contacts: friendContacts,
                    message: personalMessage || defaultMessage,
                    coupleProfile,
                  });
                }
              }}
              disabled={
                isLoading ||
                (invitationMethod !== 'link' && friendContacts.length === 0)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  <span>Sending...</span>
                </div>
              ) : invitationMethod === 'link' ? (
                'Copy Link'
              ) : (
                `Send ${friendContacts.length} Invitation${friendContacts.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper Functions
function getSocialPlatformStyle(platform: string) {
  const styles = {
    instagram:
      'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
    facebook: 'bg-blue-600 text-white hover:bg-blue-700',
    twitter: 'bg-sky-500 text-white hover:bg-sky-600',
    tiktok: 'bg-black text-white hover:bg-gray-800',
    pinterest: 'bg-red-600 text-white hover:bg-red-700',
    whatsapp: 'bg-green-600 text-white hover:bg-green-700',
  };

  return (
    styles[platform as keyof typeof styles] ||
    'bg-gray-500 text-white hover:bg-gray-600'
  );
}

// Types
interface FriendContact {
  id: string | number;
  email?: string;
  phone?: string;
}

interface FriendInvitationData {
  method: InvitationType;
  contacts: FriendContact[];
  message: string;
  coupleProfile: CoupleProfile;
}
