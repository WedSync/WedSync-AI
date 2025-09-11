'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShareIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  TagIcon,
  StarIcon,
  RocketLaunchIcon,
  CameraIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '@heroicons/react/24/outline';
import { WeddingHighlight, ShareableContent } from '@/types/couple-reporting';

interface SocialShareableReportProps {
  weddingHighlights: WeddingHighlight[];
  onGenerateReport: () => void;
  isPending: boolean;
}

export function SocialShareableReport({
  weddingHighlights,
  onGenerateReport,
  isPending,
}: SocialShareableReportProps) {
  const [shareableContent, setShareableContent] = useState<ShareableContent[]>(
    [],
  );
  const [selectedTemplate, setSelectedTemplate] = useState<
    'story' | 'post' | 'carousel'
  >('story');

  useEffect(() => {
    generateShareableContent(weddingHighlights, selectedTemplate).then(
      setShareableContent,
    );
  }, [weddingHighlights, selectedTemplate]);

  return (
    <div className="social-shareable-report space-y-8">
      {/* Header */}
      <motion.div
        className="report-header text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Social Media Highlights
        </h2>
        <p className="text-gray-600">
          Create Instagram-worthy content to share your wedding journey
        </p>
      </motion.div>

      {/* Template Selector */}
      <motion.div
        className="template-selector"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Choose Your Share Style
        </h3>
        <div className="template-options grid grid-cols-1 md:grid-cols-3 gap-6">
          <TemplateOption
            type="story"
            title="Instagram Story"
            description="Perfect for sharing quick updates and behind-the-scenes moments"
            isSelected={selectedTemplate === 'story'}
            onSelect={() => setSelectedTemplate('story')}
            previewImage="/images/story-template-preview.jpg"
            features={[
              '9:16 aspect ratio',
              'Tap-friendly design',
              'Sticker-ready',
            ]}
          />
          <TemplateOption
            type="post"
            title="Instagram Post"
            description="Beautiful single-image insights for your main feed"
            isSelected={selectedTemplate === 'post'}
            onSelect={() => setSelectedTemplate('post')}
            previewImage="/images/post-template-preview.jpg"
            features={[
              '1:1 square format',
              'High engagement',
              'Archive worthy',
            ]}
          />
          <TemplateOption
            type="carousel"
            title="Carousel Post"
            description="Multi-slide journey showcase with swipe interaction"
            isSelected={selectedTemplate === 'carousel'}
            onSelect={() => setSelectedTemplate('carousel')}
            previewImage="/images/carousel-template-preview.jpg"
            features={['10 slides max', 'Story telling', 'Higher reach']}
          />
        </div>
      </motion.div>

      {/* Shareable Content Preview */}
      <motion.div
        className="shareable-content-preview"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            ✨ Your Wedding Journey Highlights
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <TrendingUpIcon className="w-4 h-4" />
            <span>{shareableContent.length} content pieces ready</span>
          </div>
        </div>

        <div className="content-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shareableContent.map((content, index) => (
            <ShareableContentCard
              key={content.contentId}
              content={content}
              index={index}
            />
          ))}
        </div>
      </motion.div>

      {/* Wedding Stats Infographic */}
      <motion.div
        className="wedding-stats-infographic"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          📈 Your Wedding by the Numbers
        </h3>
        <WeddingStatsInfographic
          stats={{
            daysPlanning: calculatePlanningDays(),
            vendorsCoordinated: weddingHighlights.filter(
              (h) => h.type === 'vendor',
            ).length,
            milestonesCompleted: weddingHighlights.filter((h) => h.completed)
              .length,
            budgetOptimizationSaved: calculateSavingsAmount(),
            friendsInvolved: calculateFriendsInvolved(),
            decisionsMade: calculateDecisionsMade(),
          }}
          visualStyle="playful"
        />
      </motion.div>

      {/* Vendor Shoutouts */}
      <motion.div
        className="vendor-shoutouts"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🎉 Vendor Love
        </h3>
        <div className="vendor-highlight-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weddingHighlights
            .filter((h) => h.type === 'vendor' && h.rating && h.rating >= 4.5)
            .slice(0, 6)
            .map((highlight) => (
              <VendorShoutoutCard
                key={highlight.highlightId}
                highlight={highlight}
                onCreateShoutout={() =>
                  createVendorShoutout(highlight.highlightId)
                }
              />
            ))}
        </div>
      </motion.div>

      {/* Viral Growth Features */}
      <motion.div
        className="viral-growth-features"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🚀 Share the Love
        </h3>
        <div className="growth-actions grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GrowthActionCard
            title="Tag Your Vendors"
            description="Help other couples discover amazing suppliers"
            action="auto_tag"
            icon={<TagIcon className="w-6 h-6" />}
            reward="Unlock premium templates"
            color="blue"
          />
          <GrowthActionCard
            title="Inspire Other Couples"
            description="Share your planning journey and tips"
            action="share_journey"
            icon={<HeartIcon className="w-6 h-6" />}
            reward="Get featured on WedMe"
            color="pink"
          />
          <GrowthActionCard
            title="Rate Your Experience"
            description="Help improve the wedding community"
            action="rate_vendors"
            icon={<StarIcon className="w-6 h-6" />}
            reward="Access to insider tips"
            color="purple"
          />
        </div>
      </motion.div>

      {/* Hashtag Recommendations */}
      <motion.div
        className="hashtag-recommendations bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          📱 Trending Hashtags for You
        </h3>
        <HashtagRecommendations />
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="report-actions flex flex-col sm:flex-row gap-4 pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <button
          onClick={onGenerateReport}
          disabled={isPending}
          className="flex-1 bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Magic...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5 mr-2" />
              Generate All Shareable Content
            </>
          )}
        </button>

        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
          <RocketLaunchIcon className="w-5 h-5 mr-2" />
          Schedule Social Posts
        </button>
      </motion.div>
    </div>
  );
}

interface TemplateOptionProps {
  type: 'story' | 'post' | 'carousel';
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  previewImage: string;
  features: string[];
}

function TemplateOption({
  type,
  title,
  description,
  isSelected,
  onSelect,
  previewImage,
  features,
}: TemplateOptionProps) {
  return (
    <motion.button
      onClick={onSelect}
      className={`template-option w-full text-left p-6 rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-r from-pink-50 to-purple-50 shadow-lg border-2 border-pink-300'
          : 'bg-white hover:shadow-md border border-gray-200 hover:border-gray-300'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start space-x-4">
        {/* Preview Image */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
          <CameraIcon className="w-8 h-8 text-gray-500" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600 mb-3">{description}</p>

          <div className="flex flex-wrap gap-1">
            {features.map((feature, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0"
          >
            <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

interface ShareableContentCardProps {
  content: ShareableContent;
  index: number;
}

function ShareableContentCard({ content, index }: ShareableContentCardProps) {
  return (
    <motion.div
      className="shareable-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      {/* Preview Image */}
      <div className="relative aspect-square bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <CameraIcon className="w-12 h-12 text-gray-400" />
        </div>

        {/* Content Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-white bg-opacity-90 text-xs font-medium text-gray-700 rounded-full capitalize">
            {content.type}
          </span>
        </div>

        {/* Platform Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-pink-500 text-xs font-medium text-white rounded-full capitalize">
            {content.platform}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          {content.title}
        </h4>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {content.description}
        </p>

        {/* Engagement Prediction */}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <HeartIcon className="w-4 h-4 mr-1" />
              {content.expectedEngagement.likes}+ likes
            </span>
            <span className="flex items-center">
              <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
              {content.expectedEngagement.comments}+ comments
            </span>
          </div>
        </div>

        {/* Hashtags */}
        {content.hashtags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {content.hashtags.slice(0, 3).map((hashtag, i) => (
                <span
                  key={i}
                  className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
                >
                  #{hashtag}
                </span>
              ))}
              {content.hashtags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{content.hashtags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            onClick={() => downloadShareableContent(content.contentId)}
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            Download
          </button>
          <button
            className="flex-1 bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors flex items-center justify-center"
            onClick={() => shareToSocial(content, content.platform)}
          >
            <ShareIcon className="w-4 h-4 mr-1" />
            Share
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface WeddingStatsInfographicProps {
  stats: {
    daysPlanning: number;
    vendorsCoordinated: number;
    milestonesCompleted: number;
    budgetOptimizationSaved: number;
    friendsInvolved: number;
    decisionsMade: number;
  };
  visualStyle: string;
}

function WeddingStatsInfographic({
  stats,
  visualStyle,
}: WeddingStatsInfographicProps) {
  const statItems = [
    {
      label: 'Days Planning',
      value: stats.daysPlanning,
      icon: '📅',
      suffix: 'days',
    },
    {
      label: 'Vendors Coordinated',
      value: stats.vendorsCoordinated,
      icon: '👥',
      suffix: 'suppliers',
    },
    {
      label: 'Milestones Completed',
      value: stats.milestonesCompleted,
      icon: '✅',
      suffix: 'tasks',
    },
    {
      label: 'Money Saved',
      value: stats.budgetOptimizationSaved,
      icon: '💰',
      prefix: '£',
      suffix: 'saved',
    },
    {
      label: 'Friends Involved',
      value: stats.friendsInvolved,
      icon: '👫',
      suffix: 'friends',
    },
    {
      label: 'Decisions Made',
      value: stats.decisionsMade,
      icon: '🤔',
      suffix: 'choices',
    },
  ];

  return (
    <div className="wedding-stats-infographic bg-white rounded-2xl p-8 border border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="stat-item text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="text-4xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stat.prefix}
              {stat.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">{stat.suffix}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all">
          Create Infographic Story
        </button>
      </div>
    </div>
  );
}

interface VendorShoutoutCardProps {
  highlight: WeddingHighlight;
  onCreateShoutout: () => void;
}

function VendorShoutoutCard({
  highlight,
  onCreateShoutout,
}: VendorShoutoutCardProps) {
  return (
    <div className="vendor-shoutout-card bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mr-4">
          <span className="text-xl">
            {getCategoryEmoji(highlight.category)}
          </span>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{highlight.title}</h4>
          <p className="text-sm text-gray-500 capitalize">
            {highlight.category}
          </p>
        </div>
      </div>

      <div className="flex items-center mb-3">
        {[...Array(5)].map((_, i) => (
          <StarIcon
            key={i}
            className={`w-4 h-4 ${
              i < (highlight.rating || 0)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{highlight.rating}/5</span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        {highlight.description}
      </p>

      <button
        onClick={onCreateShoutout}
        className="w-full bg-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-700 transition-colors"
      >
        Create Shoutout Post
      </button>
    </div>
  );
}

interface GrowthActionCardProps {
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
  reward: string;
  color: 'blue' | 'pink' | 'purple';
}

function GrowthActionCard({
  title,
  description,
  action,
  icon,
  reward,
  color,
}: GrowthActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    pink: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    purple:
      'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  };

  return (
    <motion.div
      className={`growth-action-card p-6 rounded-xl border transition-colors cursor-pointer ${colorClasses[color]}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <div className="text-xs font-medium">🎁 Reward: {reward}</div>
        </div>
      </div>
    </motion.div>
  );
}

function HashtagRecommendations() {
  const hashtagCategories = [
    {
      category: 'Personal',
      hashtags: [
        '#OurLoveStory',
        '#EngagedLife',
        '#CountdownBegins',
        '#BrideToBe',
      ],
    },
    {
      category: 'Wedding Industry',
      hashtags: [
        '#WeddingPlanning',
        '#WeddingInspo',
        '#DreamWedding',
        '#LoveWins',
      ],
    },
    {
      category: 'Trending',
      hashtags: [
        '#WeddingVibes',
        '#HappilyEverAfter',
        '#LoveIsInTheAir',
        '#SaidYes',
      ],
    },
  ];

  return (
    <div className="hashtag-recommendations space-y-4">
      {hashtagCategories.map((category) => (
        <div key={category.category} className="category-group">
          <h4 className="font-semibold text-gray-900 mb-2">
            {category.category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {category.hashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="px-3 py-1 bg-white text-sm text-gray-700 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {hashtag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility Functions
async function generateShareableContent(
  highlights: WeddingHighlight[],
  template: string,
): Promise<ShareableContent[]> {
  // Mock implementation - would generate actual shareable content
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [
    {
      contentId: '1',
      title: 'Wedding Planning Progress',
      description:
        'Share your amazing progress with friends and inspire other couples',
      type: 'story',
      platform: 'instagram',
      previewUrl: '/images/progress-story.jpg',
      downloadUrl: '/downloads/progress-story.jpg',
      dimensions: { width: 1080, height: 1920 },
      expectedEngagement: { likes: 150, comments: 25, shares: 10 },
      hashtags: ['WeddingPlanning', 'EngagedLife', 'LoveStory'],
      vendorTags: [],
      templateId: 'progress-story-1',
      customizations: {
        colorScheme: 'romantic',
        fontFamily: 'elegant',
        brandElements: [],
        personalizedText: [],
        vendorCredits: true,
      },
    },
    {
      contentId: '2',
      title: 'Budget Wins',
      description: 'Celebrate your smart spending and budget optimization',
      type: 'post',
      platform: 'instagram',
      previewUrl: '/images/budget-post.jpg',
      downloadUrl: '/downloads/budget-post.jpg',
      dimensions: { width: 1080, height: 1080 },
      expectedEngagement: { likes: 200, comments: 35, shares: 15 },
      hashtags: ['WeddingBudget', 'SmartSpending', 'WeddingTips'],
      vendorTags: [],
      templateId: 'budget-post-1',
      customizations: {
        colorScheme: 'modern',
        fontFamily: 'clean',
        brandElements: [],
        personalizedText: [],
        vendorCredits: true,
      },
    },
  ];
}

function calculatePlanningDays(): number {
  return 180; // Mock calculation
}

function calculateSavingsAmount(): number {
  return 1200; // Mock calculation
}

function calculateFriendsInvolved(): number {
  return 15; // Mock calculation
}

function calculateDecisionsMade(): number {
  return 47; // Mock calculation
}

function getCategoryEmoji(category: string): string {
  const emojiMap: { [key: string]: string } = {
    photography: '📸',
    venue: '🏰',
    catering: '🍽️',
    flowers: '🌸',
    music: '🎵',
    attire: '👗',
    default: '💎',
  };
  return emojiMap[category] || emojiMap.default;
}

async function downloadShareableContent(contentId: string): Promise<void> {
  console.log('Downloading content:', contentId);
}

async function shareToSocial(
  content: ShareableContent,
  platform: string,
): Promise<void> {
  console.log('Sharing to social:', content.title, platform);
}

async function createVendorShoutout(highlightId: string): Promise<void> {
  console.log('Creating vendor shoutout:', highlightId);
}
