'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CoupleProfile,
  WeddingFile,
  SharingGroup,
  ActiveShare,
  PrivacySettings,
  IntelligentSharingGroup,
  GroupingCriteria,
  CoupleContact,
  SharingUpdate,
  ContactsIntegration,
  DownloadTracking,
  SharingMetrics,
  FamilyFeedback,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createIntelligentSharingGroups } from '@/lib/wedme/sharing-engine';
import SharingGroupManager from './SharingGroupManager';
import ContentCurationSuite from './ContentCurationSuite';
import PrivacyControlCenter from './PrivacyControlCenter';
import SharingAnalyticsDashboard from './SharingAnalyticsDashboard';
import {
  Users,
  Shield,
  Share2,
  BarChart,
  Heart,
  Eye,
  Lock,
  Globe,
  UserCheck,
  Settings,
  Bell,
  Download,
  MessageCircle,
  Star,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface FamilyFriendsSharingProps {
  couple: CoupleProfile;
  weddingFiles: WeddingFile[];
  onSharingUpdate: (update: SharingUpdate) => void;
  className?: string;
}

const FamilyFriendsSharing: React.FC<FamilyFriendsSharingProps> = ({
  couple,
  weddingFiles,
  onSharingUpdate,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('groups');
  const [sharingGroups, setSharingGroups] = useState<SharingGroup[]>([]);
  const [activeShares, setActiveShares] = useState<ActiveShare[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>();
  const [selectedFiles, setSelectedFiles] = useState<WeddingFile[]>([]);
  const [showQuickShare, setShowQuickShare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create intelligent sharing groups based on contacts
  const intelligentGroups = useMemo(() => {
    return createIntelligentSharingGroups(couple.contacts, {
      weddingRole: true,
      relationshipLevel: true,
      geographicLocation: true,
      socialConnections: true,
    });
  }, [couple.contacts]);

  // Merge custom groups with intelligent groups
  const allSharingGroups = useMemo(() => {
    return [...intelligentGroups, ...sharingGroups];
  }, [intelligentGroups, sharingGroups]);

  // Recent sharing activity
  const recentActivity = useMemo(() => {
    return activeShares
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [activeShares]);

  // Sharing statistics
  const sharingStats = useMemo(() => {
    const totalShares = activeShares.length;
    const totalViews = activeShares.reduce(
      (sum, share) => sum + (share.viewCount || 0),
      0,
    );
    const totalDownloads = activeShares.reduce(
      (sum, share) => sum + (share.downloadCount || 0),
      0,
    );
    const totalComments = activeShares.reduce(
      (sum, share) => sum + (share.comments?.length || 0),
      0,
    );

    return {
      totalShares,
      totalViews,
      totalDownloads,
      totalComments,
      activeGroups: allSharingGroups.filter(
        (g) => g.activityMetrics.lastActivity,
      ).length,
    };
  }, [activeShares, allSharingGroups]);

  // Handle group updates
  const handleGroupUpdate = useCallback(
    (groups: SharingGroup[]) => {
      setSharingGroups(groups);
      onSharingUpdate({
        type: 'groups_updated',
        groups,
        timestamp: new Date(),
      });
    },
    [onSharingUpdate],
  );

  // Handle content curation completion
  const handleCurationComplete = useCallback(
    (shares: ActiveShare[]) => {
      setActiveShares((prev) => [...prev, ...shares]);
      onSharingUpdate({
        type: 'content_shared',
        shares,
        timestamp: new Date(),
      });
    },
    [onSharingUpdate],
  );

  // Handle privacy settings update
  const handlePrivacyUpdate = useCallback(
    (settings: PrivacySettings) => {
      setPrivacySettings(settings);
      onSharingUpdate({
        type: 'privacy_updated',
        privacySettings: settings,
        timestamp: new Date(),
      });
    },
    [onSharingUpdate],
  );

  // Quick share functionality
  const handleQuickShare = useCallback(
    async (groupIds: string[], files: WeddingFile[]) => {
      setIsLoading(true);
      try {
        const newShares: ActiveShare[] = groupIds.map((groupId) => {
          const group = allSharingGroups.find((g) => g.id === groupId);
          return {
            id: `share_${Date.now()}_${groupId}`,
            groupId,
            groupName: group?.name || 'Unknown Group',
            files,
            createdAt: new Date(),
            expiresAt: group?.permissions.fullAccess
              ? undefined
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            accessLevel: group?.accessLevel || 'view_only',
            viewCount: 0,
            downloadCount: 0,
            shareCount: 0,
            comments: [],
            reactions: [],
            isActive: true,
            passwordProtected: privacySettings?.requirePassword || false,
            watermarked: privacySettings?.watermarkEnabled || false,
          };
        });

        setActiveShares((prev) => [...prev, ...newShares]);
        handleCurationComplete(newShares);
        setShowQuickShare(false);
        setSelectedFiles([]);
      } catch (error) {
        console.error('Quick share failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [allSharingGroups, privacySettings, handleCurationComplete],
  );

  // Load initial data
  useEffect(() => {
    // Load existing privacy settings
    setPrivacySettings({
      defaultAccessLevel: 'view_only',
      requirePassword: false,
      watermarkEnabled: true,
      downloadTracking: true,
      geographicRestrictions: [],
      timeBasedAccess: true,
      notificationPreferences: {
        onShare: true,
        onView: false,
        onDownload: true,
        onComment: true,
      },
      dataRetention: {
        keepDownloadLogs: 90,
        keepViewLogs: 30,
        autoDeleteExpired: true,
      },
    });

    // Load existing active shares (mock data)
    const mockShares: ActiveShare[] = [
      {
        id: 'share_1',
        groupId: 'immediate_family',
        groupName: 'Immediate Family',
        files: weddingFiles.slice(0, 10),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        accessLevel: 'full_access',
        viewCount: 24,
        downloadCount: 8,
        shareCount: 3,
        comments: [],
        reactions: [],
        isActive: true,
        passwordProtected: false,
        watermarked: false,
      },
    ];
    setActiveShares(mockShares);
  }, [weddingFiles]);

  return (
    <div
      className={`family-friends-sharing min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className}`}
    >
      {/* Header */}
      <div className="bg-white border-b border-blue-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Family & Friends Sharing
                </h1>
                <p className="text-gray-600">
                  Share your precious moments with the people who matter most
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowQuickShare(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Share
              </Button>

              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  {allSharingGroups.length} groups
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700"
                >
                  {activeShares.length} active shares
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {sharingStats.totalShares}
              </div>
              <div className="text-xs text-gray-600">Total Shares</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {sharingStats.totalViews}
              </div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {sharingStats.totalDownloads}
              </div>
              <div className="text-xs text-gray-600">Downloads</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {sharingStats.totalComments}
              </div>
              <div className="text-xs text-gray-600">Comments</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">
                {sharingStats.activeGroups}
              </div>
              <div className="text-xs text-gray-600">Active Groups</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Recent Activity */}
          <div className="lg:col-span-3">
            <Card className="sticky top-6 p-4 bg-white/80 backdrop-blur-sm border-blue-100">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Recent Activity
                </h3>

                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((share) => (
                      <div key={share.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {share.groupName}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {share.files.length} files
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            {share.viewCount}
                            <Download className="w-3 h-3 ml-2" />
                            {share.downloadCount}
                          </div>
                          <span>
                            {new Date(share.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Share2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="groups" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Groups
                </TabsTrigger>
                <TabsTrigger value="curate" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Curate
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2"
                >
                  <BarChart className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="groups" className="space-y-6">
                  <SharingGroupManager
                    intelligentGroups={intelligentGroups}
                    customGroups={sharingGroups}
                    onGroupUpdate={handleGroupUpdate}
                    contactsImport={couple.contactsIntegration}
                    couple={couple}
                  />
                </TabsContent>

                <TabsContent value="curate" className="space-y-6">
                  <ContentCurationSuite
                    files={weddingFiles}
                    sharingGroups={allSharingGroups}
                    onCurationComplete={handleCurationComplete}
                    aiSuggestions={true}
                    couple={couple}
                  />
                </TabsContent>

                <TabsContent value="privacy" className="space-y-6">
                  <PrivacyControlCenter
                    settings={privacySettings}
                    onSettingsUpdate={handlePrivacyUpdate}
                    sharingHistory={activeShares}
                    downloadTracking={couple.downloadTracking}
                    couple={couple}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <SharingAnalyticsDashboard
                    activeShares={activeShares}
                    engagementMetrics={couple.sharingMetrics}
                    familyFeedback={couple.familyFeedback}
                    viralSpread={couple.viralMetrics}
                    couple={couple}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Quick Share Modal */}
      <AnimatePresence>
        {showQuickShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQuickShare(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Quick Share</h2>
                <p className="text-gray-600 mt-1">
                  Share selected memories with your groups instantly
                </p>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {/* File Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files to Share
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {weddingFiles.slice(0, 8).map((file) => {
                        const isSelected = selectedFiles.some(
                          (f) => f.id === file.id,
                        );
                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              setSelectedFiles((prev) =>
                                isSelected
                                  ? prev.filter((f) => f.id !== file.id)
                                  : [...prev, file],
                              );
                            }}
                            className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                              isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={file.thumbnailUrl || file.url}
                              alt="Wedding photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedFiles.length} files selected
                    </p>
                  </div>

                  {/* Group Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Groups to Share With
                    </label>
                    <div className="space-y-2">
                      {allSharingGroups.slice(0, 5).map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {group.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {group.contacts.length} members •{' '}
                              {group.accessLevel}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowQuickShare(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleQuickShare(
                      ['immediate_family', 'wedding_party'],
                      selectedFiles,
                    )
                  }
                  disabled={selectedFiles.length === 0 || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {isLoading ? 'Sharing...' : 'Share Now'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FamilyFriendsSharing;
