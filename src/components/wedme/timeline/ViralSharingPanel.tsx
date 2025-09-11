'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagicalTimeline,
  TimelineMoment,
  WeddingFile,
  CoupleProfile,
  ViralSharingRequest,
  SocialPlatform,
  ContentStrategy,
  ViralOptimization,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Share2,
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  Heart,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Send,
  Calendar,
  Target,
  Zap,
  Star,
  CheckCircle,
  BarChart,
  Eye,
  MessageCircle,
  Repeat,
  Hash,
} from 'lucide-react';

interface ViralSharingPanelProps {
  timeline: MagicalTimeline;
  selectedMoment?: TimelineMoment;
  selectedFiles: WeddingFile[];
  couple: CoupleProfile;
  onViralShare: (shareRequest: ViralSharingRequest) => void;
  onClose: () => void;
}

const ViralSharingPanel: React.FC<ViralSharingPanelProps> = ({
  timeline,
  selectedMoment,
  selectedFiles,
  couple,
  onViralShare,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('optimize');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
  ]);
  const [customCaption, setCustomCaption] = useState('');
  const [viralSettings, setViralSettings] = useState<ViralOptimization>({
    aiContentOptimization: true,
    optimalTimingAnalysis: true,
    hashtagOptimization: true,
    crossPlatformSyncing: true,
    influencerTagging: false,
    vendorAmplification: true,
    friendNetworkLeverage: true,
    trendingTopicIntegration: true,
  });
  const [scheduledTime, setScheduledTime] = useState<Date>();
  const [viralPredictions, setViralPredictions] = useState<any>(null);

  // Content to share - either selected files or moment files
  const contentToShare =
    selectedFiles.length > 0 ? selectedFiles : selectedMoment?.files || [];

  // AI-generated content suggestions
  const contentSuggestions = useMemo(() => {
    if (!selectedMoment) return [];

    return [
      {
        id: '1',
        type: 'romantic',
        caption: `✨ ${selectedMoment.title} ✨\n\nEvery moment of our wedding day was pure magic. This one especially takes our breath away! 💕\n\n#WeddingBliss #LoveStory #HappilyEverAfter`,
        hashtags: [
          '#WeddingBliss',
          '#LoveStory',
          '#HappilyEverAfter',
          '#WeddingDay',
          '#TrueLove',
        ],
        viralPotential: 85,
        platforms: ['instagram', 'facebook'],
      },
      {
        id: '2',
        type: 'behind_scenes',
        caption: `Behind the scenes magic! 🎬\n\n${selectedMoment.description || 'This moment captures the real emotions of our special day.'}\n\nShoutout to our amazing vendors who made this possible! 🙌`,
        hashtags: [
          '#BehindTheScenes',
          '#WeddingMagic',
          '#DreamTeam',
          '#WeddingVendors',
        ],
        viralPotential: 78,
        platforms: ['instagram', 'tiktok'],
      },
      {
        id: '3',
        type: 'vendor_spotlight',
        caption: `Incredible work by our wedding dream team! 👏\n\nWe're still in awe of how perfectly everything came together. If you're planning your special day, these vendors are AMAZING!\n\n${selectedMoment.vendor ? `📸 ${selectedMoment.vendor.name}` : ''}`,
        hashtags: [
          '#WeddingVendors',
          '#DreamTeam',
          '#WeddingInspiration',
          '#QualityWork',
        ],
        viralPotential: 72,
        platforms: ['facebook', 'linkedin'],
      },
    ];
  }, [selectedMoment]);

  // Platform configurations
  const platformConfig = {
    instagram: {
      name: 'Instagram',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      maxChars: 2200,
      features: ['stories', 'reels', 'posts', 'hashtags'],
      engagement: 'High',
    },
    facebook: {
      name: 'Facebook',
      icon: Facebook,
      color: 'from-blue-500 to-blue-600',
      maxChars: 63206,
      features: ['posts', 'stories', 'events'],
      engagement: 'Medium',
    },
    twitter: {
      name: 'Twitter',
      icon: Twitter,
      color: 'from-blue-400 to-blue-500',
      maxChars: 280,
      features: ['tweets', 'threads', 'hashtags'],
      engagement: 'High',
    },
    linkedin: {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'from-blue-600 to-blue-700',
      maxChars: 3000,
      features: ['posts', 'professional'],
      engagement: 'Medium',
    },
  };

  // Calculate viral predictions
  useEffect(() => {
    if (contentToShare.length > 0) {
      const avgViralPotential =
        contentToShare.reduce(
          (sum, file) => sum + (file.viralPotential || 0),
          0,
        ) / contentToShare.length;
      const platformMultiplier = selectedPlatforms.length * 1.2;
      const optimizationBonus =
        Object.values(viralSettings).filter(Boolean).length * 5;

      setViralPredictions({
        estimatedReach: Math.round(
          avgViralPotential * platformMultiplier * 100 + optimizationBonus * 50,
        ),
        engagementRate: Math.round(
          (avgViralPotential + optimizationBonus) * 0.8,
        ),
        viralCoefficient: (
          (avgViralPotential + optimizationBonus) /
          100
        ).toFixed(2),
        bestPerformingPlatform: selectedPlatforms[0] || 'instagram',
      });
    }
  }, [contentToShare, selectedPlatforms, viralSettings]);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleViralShare = () => {
    const shareRequest: ViralSharingRequest = {
      files: contentToShare,
      platforms: selectedPlatforms.map(
        (id) =>
          couple.connectedPlatforms.find((p) => p.name === id) || {
            id,
            name: id as any,
            isConnected: true,
            accountId: `${id}_account`,
            permissions: [],
            audienceInsights: {} as any,
            performanceMetrics: {} as any,
          },
      ),
      audienceSegments: ['friends', 'family', 'wedding_community'],
      vendorTagging: {
        enabled: viralSettings.vendorAmplification,
        autoTag: true,
        mentions: contentToShare.map((f) => f.vendor).filter(Boolean) as any[],
      },
      viralOptimization: viralSettings,
      schedulingPreferences: scheduledTime
        ? {
            scheduledTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            recurring: false,
          }
        : {
            immediate: true,
          },
      privacyControls: [],
      contentStrategy: {
        storyArc: timeline.storyArcs[0],
        postingCadence: 'optimal',
        contentMix: 'balanced',
        vendorSpotlightFrequency: 20,
        behindScenesRatio: 30,
        userGeneratedContentGoals: {} as any,
      } as ContentStrategy,
      hashtagStrategy: {
        trending: viralSettings.trendingTopicIntegration,
        branded: true,
        location: true,
        emotion: true,
      } as any,
    };

    onViralShare(shareRequest);
  };

  return (
    <div className="h-screen bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Viral Sharing</h2>
            <p className="text-sm text-gray-600">
              {contentToShare.length} file
              {contentToShare.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="optimize" className="space-y-4 m-0">
              {/* Viral Predictions */}
              {viralPredictions && (
                <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart className="w-4 h-4 text-emerald-600" />
                      Viral Predictions
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {viralPredictions.estimatedReach.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          Estimated Reach
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-teal-600">
                          {viralPredictions.engagementRate}%
                        </div>
                        <div className="text-xs text-gray-600">
                          Engagement Rate
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Content Suggestions */}
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI Content Suggestions
                  </h3>
                  <div className="space-y-3">
                    {contentSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors"
                        onClick={() => setCustomCaption(suggestion.caption)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {suggestion.type.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <TrendingUp className="w-3 h-3" />
                            {suggestion.viralPotential}% viral
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {suggestion.caption}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {suggestion.hashtags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Custom Caption */}
              <Card className="p-4">
                <div className="space-y-3">
                  <Label htmlFor="caption">Custom Caption</Label>
                  <Textarea
                    id="caption"
                    placeholder="Write your own caption..."
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="text-xs text-gray-500">
                    {customCaption.length}/2200 characters
                  </div>
                </div>
              </Card>

              {/* Viral Optimization Settings */}
              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Viral Optimization
                  </h3>

                  {Object.entries(viralSettings).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="font-medium">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase())}
                        </Label>
                        <p className="text-xs text-gray-600">
                          {getOptimizationDescription(key)}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          setViralSettings((prev) => ({
                            ...prev,
                            [key]: checked,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4 m-0">
              {/* Platform Selection */}
              <div className="grid gap-3">
                {Object.entries(platformConfig).map(([id, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedPlatforms.includes(id);
                  const isConnected = couple.connectedPlatforms.some(
                    (p) => p.name === id,
                  );

                  return (
                    <Card
                      key={id}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? `bg-gradient-to-r ${config.color} text-white`
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => isConnected && handlePlatformToggle(id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            isSelected
                              ? 'bg-white/20'
                              : `bg-gradient-to-r ${config.color}`
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              isSelected ? 'text-white' : 'text-white'
                            }`}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3
                              className={`font-medium ${
                                isSelected ? 'text-white' : 'text-gray-900'
                              }`}
                            >
                              {config.name}
                            </h3>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-white" />
                            )}
                          </div>

                          <div
                            className={`text-sm ${
                              isSelected ? 'text-white/80' : 'text-gray-600'
                            }`}
                          >
                            {isConnected ? (
                              <>
                                {config.engagement} engagement •{' '}
                                {config.features.length} features
                              </>
                            ) : (
                              'Not connected'
                            )}
                          </div>
                        </div>

                        {!isConnected && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle platform connection
                            }}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Platform Insights */}
              {selectedPlatforms.length > 0 && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      Platform Insights
                    </h3>
                    {selectedPlatforms.map((platformId) => {
                      const config =
                        platformConfig[
                          platformId as keyof typeof platformConfig
                        ];
                      const platform = couple.connectedPlatforms.find(
                        (p) => p.name === platformId,
                      );

                      return (
                        <div key={platformId} className="space-y-2">
                          <h4 className="font-medium text-gray-800">
                            {config.name}
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="font-bold text-gray-900">
                                {platform?.audienceInsights?.followerCount?.toLocaleString() ||
                                  '1.2k'}
                              </div>
                              <div className="text-xs text-gray-600">
                                Followers
                              </div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="font-bold text-gray-900">
                                {platform?.performanceMetrics
                                  ?.avgEngagementRate || '4.2'}
                                %
                              </div>
                              <div className="text-xs text-gray-600">
                                Avg Engagement
                              </div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="font-bold text-gray-900">
                                {config.engagement}
                              </div>
                              <div className="text-xs text-gray-600">
                                Potential
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 m-0">
              {/* Scheduling Options */}
              <Card className="p-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    When to Share
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Share Now</div>
                        <div className="text-sm text-gray-600">
                          Post immediately across selected platforms
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="scheduling"
                        value="now"
                        checked={!scheduledTime}
                        onChange={() => setScheduledTime(undefined)}
                        className="text-pink-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Schedule for Later</div>
                        <div className="text-sm text-gray-600">
                          Choose the optimal time based on AI analysis
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="scheduling"
                        value="scheduled"
                        checked={!!scheduledTime}
                        onChange={() =>
                          setScheduledTime(new Date(Date.now() + 3600000))
                        }
                        className="text-pink-600"
                      />
                    </div>
                  </div>

                  {scheduledTime && (
                    <div className="mt-4">
                      <Label htmlFor="schedule-time">Schedule Time</Label>
                      <input
                        id="schedule-time"
                        type="datetime-local"
                        value={scheduledTime.toISOString().slice(0, 16)}
                        onChange={(e) =>
                          setScheduledTime(new Date(e.target.value))
                        }
                        className="w-full mt-2 p-2 border rounded-lg"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Optimal Timing Suggestions */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    AI Timing Recommendations
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm">Today at 7:00 PM</span>
                      <Badge className="bg-emerald-500 text-white">
                        Peak Engagement
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm">Tomorrow at 12:00 PM</span>
                      <Badge variant="secondary">High Reach</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm">Sunday at 9:00 AM</span>
                      <Badge variant="secondary">Family Time</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* Share Button */}
          <Button
            onClick={handleViralShare}
            disabled={
              selectedPlatforms.length === 0 || contentToShare.length === 0
            }
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg"
            size="lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {scheduledTime ? 'Schedule Viral Share' : 'Share Now'}
          </Button>

          {/* Preview Stats */}
          {viralPredictions && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {viralPredictions.estimatedReach.toLocaleString()} reach
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {viralPredictions.engagementRate}% engagement
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                {viralPredictions.viralCoefficient}x viral
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for optimization descriptions
const getOptimizationDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    aiContentOptimization: 'AI-powered content enhancement and optimization',
    optimalTimingAnalysis: 'Find the best times to post for maximum engagement',
    hashtagOptimization: 'Auto-generate trending and relevant hashtags',
    crossPlatformSyncing: 'Sync content across all selected platforms',
    influencerTagging: 'Tag relevant influencers and wedding accounts',
    vendorAmplification: 'Boost vendor visibility through strategic tagging',
    friendNetworkLeverage: 'Optimize for sharing within friend networks',
    trendingTopicIntegration: 'Integrate with current trending topics',
  };

  return descriptions[key] || 'Optimize this aspect of viral sharing';
};

export default ViralSharingPanel;
