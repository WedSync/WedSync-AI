'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Camera,
  Clock,
  Users,
  Heart,
  Settings,
  Search,
  Plus,
  Bell,
  Menu,
  X,
  Upload,
  Share2,
  Star,
  Sparkles,
  TrendingUp,
  Eye,
  MessageCircle,
  Calendar,
  MapPin,
  Zap,
  Gift,
  Crown,
  Ring,
  Music,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CoupleProfile,
  WeddingFile,
  TimelineMoment,
  SharingGroup,
  ViralMetrics,
  Notification,
} from '@/types/wedme/file-management';
import {
  ProgressiveLoader,
  MemoryManager,
} from '@/lib/wedme/performance-optimization';

// Import mobile components
import MobileFileHub from './MobileFileHub';
import MobileTimelineView from './MobileTimelineView';
import MobileSharingInterface from './MobileSharingInterface';

interface MobileWedMeLayoutProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  timeline: TimelineMoment[];
  groups: SharingGroup[];
  notifications: Notification[];
  viralMetrics: ViralMetrics;
  onFileSelect?: (file: WeddingFile) => void;
  onUpload?: () => void;
  onShare?: (request: any) => Promise<any>;
  onCreateGroup?: (group: any) => void;
  onUpdateGroup?: (groupId: string, updates: any) => void;
}

export const MobileWedMeLayout: React.FC<MobileWedMeLayoutProps> = ({
  couple,
  files,
  timeline,
  groups,
  notifications,
  viralMetrics,
  onFileSelect,
  onUpload,
  onShare,
  onCreateGroup,
  onUpdateGroup,
}) => {
  const [activeTab, setActiveTab] = useState<
    'home' | 'files' | 'timeline' | 'sharing' | 'profile'
  >('home');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<WeddingFile[]>([]);
  const [showSharingInterface, setShowSharingInterface] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Performance optimization
  const memoryManager = useMemo(() => new MemoryManager(), []);

  useEffect(() => {
    // Track unread notifications
    setUnreadNotifications(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    // Cleanup memory on component unmount
    return () => {
      memoryManager.cleanup();
    };
  }, [memoryManager]);

  // Quick stats for couple
  const quickStats = useMemo(
    () => ({
      totalFiles: files.length,
      photosCount: files.filter((f) => f.category === 'photos').length,
      videosCount: files.filter((f) => f.category === 'videos').length,
      timelineMoments: timeline.length,
      totalViews: viralMetrics.totalViews,
      totalLikes: viralMetrics.totalEngagement,
      viralScore: viralMetrics.viralScore,
      daysUntilWedding: couple.weddingDate
        ? Math.ceil(
            (new Date(couple.weddingDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    }),
    [files, timeline, viralMetrics, couple.weddingDate],
  );

  const handleFileUpload = () => {
    setShowMobileMenu(false);
    onUpload?.();
  };

  const handleShare = (filesToShare?: WeddingFile[]) => {
    setSelectedFiles(filesToShare || selectedFiles);
    setShowSharingInterface(true);
    setShowMobileMenu(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-rose-50 to-pink-50 safe-area-inset relative">
      {/* Mobile Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-rose-200 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
              <Ring className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">WedMe</h1>
              <p className="text-xs text-gray-600">
                {couple.partnerOne.firstName} & {couple.partnerTwo.firstName}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-2">
            {/* Search Toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSearch(!showSearch)}
              className="relative"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Notifications */}
            <Button size="sm" variant="ghost" className="relative">
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </Button>

            {/* Menu Toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <Input
                placeholder="Search files, moments, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 w-80 h-full bg-white shadow-xl p-6 safe-area-inset-right"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 mb-8">
                <Button
                  onClick={handleFileUpload}
                  className="w-full justify-start bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                >
                  <Upload className="w-4 h-4 mr-3" />
                  Upload Files
                </Button>
                <Button
                  onClick={() => handleShare()}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  Share Memories
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-3" />
                  Wedding Planner
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                  Your Wedding Stats
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-rose-600 text-xl">
                      {quickStats.totalFiles}
                    </div>
                    <div className="text-gray-600">Files</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-pink-600 text-xl">
                      {quickStats.timelineMoments}
                    </div>
                    <div className="text-gray-600">Moments</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600 text-xl">
                      {quickStats.totalViews}
                    </div>
                    <div className="text-gray-600">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600 text-xl">
                      {quickStats.totalLikes}
                    </div>
                    <div className="text-gray-600">Likes</div>
                  </div>
                </div>

                {quickStats.daysUntilWedding !== null && (
                  <div className="mt-4 text-center">
                    <div className="text-2xl font-bold text-rose-600">
                      {quickStats.daysUntilWedding > 0
                        ? `${quickStats.daysUntilWedding} days`
                        : quickStats.daysUntilWedding === 0
                          ? 'Today!'
                          : 'Married!'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {quickStats.daysUntilWedding > 0
                        ? 'until your wedding'
                        : quickStats.daysUntilWedding === 0
                          ? 'Your wedding day!'
                          : 'Congratulations!'}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Section */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={couple.partnerOne.avatar} />
                  <AvatarFallback>
                    {couple.partnerOne.firstName[0]}
                    {couple.partnerTwo.firstName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {couple.partnerOne.firstName} &{' '}
                    {couple.partnerTwo.firstName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {couple.weddingDate &&
                      new Date(couple.weddingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <HomeView
              couple={couple}
              files={files}
              timeline={timeline}
              quickStats={quickStats}
              viralMetrics={viralMetrics}
              searchQuery={searchQuery}
              onFileSelect={onFileSelect}
              onUpload={handleFileUpload}
              onShare={handleShare}
            />
          )}

          {activeTab === 'files' && (
            <MobileFileHub
              couple={couple}
              files={files}
              onFileSelect={onFileSelect}
              onShare={handleShare}
              onUpload={handleFileUpload}
            />
          )}

          {activeTab === 'timeline' && (
            <MobileTimelineView
              timeline={timeline}
              couple={couple}
              onMomentSelect={(moment) =>
                console.log('Selected moment:', moment)
              }
              onShare={(moment, groups) =>
                console.log('Share moment:', moment, groups)
              }
              onViewFile={onFileSelect}
            />
          )}

          {activeTab === 'sharing' && (
            <SharingView
              couple={couple}
              groups={groups}
              viralMetrics={viralMetrics}
              onShare={handleShare}
              onCreateGroup={onCreateGroup}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              couple={couple}
              quickStats={quickStats}
              onUpload={handleFileUpload}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t border-rose-200 px-4 py-2 safe-area-inset-bottom"
      >
        <div className="flex items-center justify-around">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'files', label: 'Files', icon: Camera },
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'sharing', label: 'Share', icon: Users },
            { id: 'profile', label: 'Profile', icon: Heart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center space-y-1 p-2 min-w-0 ${
                  isActive ? 'text-rose-600' : 'text-gray-500'
                }`}
                whileTap={{ scale: 0.95 }}
                animate={{
                  color: isActive ? '#e11d48' : '#6b7280',
                  scale: isActive ? 1.05 : 1,
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium truncate">
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="w-1 h-1 bg-rose-600 rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-20 right-4 z-40 safe-area-inset-bottom"
      >
        <Button
          size="lg"
          onClick={handleFileUpload}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Sharing Interface Modal */}
      <AnimatePresence>
        {showSharingInterface && onShare && onCreateGroup && onUpdateGroup && (
          <MobileSharingInterface
            couple={couple}
            selectedFiles={selectedFiles}
            groups={groups}
            onShare={onShare}
            onCreateGroup={onCreateGroup}
            onUpdateGroup={onUpdateGroup}
            onClose={() => {
              setShowSharingInterface(false);
              setSelectedFiles([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Home View Component
interface HomeViewProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  timeline: TimelineMoment[];
  quickStats: any;
  viralMetrics: ViralMetrics;
  searchQuery: string;
  onFileSelect?: (file: WeddingFile) => void;
  onUpload?: () => void;
  onShare?: (files?: WeddingFile[]) => void;
}

const HomeView: React.FC<HomeViewProps> = ({
  couple,
  files,
  timeline,
  quickStats,
  viralMetrics,
  searchQuery,
  onFileSelect,
  onUpload,
  onShare,
}) => {
  const recentFiles = useMemo(() => {
    return files
      .filter(
        (file) =>
          !searchQuery ||
          file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
      .sort(
        (a, b) =>
          new Date(b.uploadedAt || 0).getTime() -
          new Date(a.uploadedAt || 0).getTime(),
      )
      .slice(0, 8);
  }, [files, searchQuery]);

  const recentMoments = useMemo(() => {
    return timeline
      .filter(
        (moment) =>
          !searchQuery ||
          moment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          moment.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 3);
  }, [timeline, searchQuery]);

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full overflow-y-auto px-4 py-6 space-y-6"
    >
      {/* Welcome Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {couple.partnerOne.firstName} &{' '}
          {couple.partnerTwo.firstName}!
        </h2>
        <p className="text-gray-600">
          Your beautiful wedding journey, all in one place
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-rose-100 to-pink-100 border-rose-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Camera className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-600">
              {quickStats.totalFiles}
            </div>
            <div className="text-sm text-gray-600">Wedding Files</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-100 to-indigo-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(viralMetrics.viralScore * 100)}%
            </div>
            <div className="text-sm text-gray-600">Viral Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Memories
          </h3>
          <Button variant="ghost" size="sm" onClick={onUpload}>
            <Plus className="w-4 h-4 mr-1" />
            Add More
          </Button>
        </div>

        {recentFiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {recentFiles.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => onFileSelect?.(file)}
              >
                {file.category === 'photos' && file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <getFileIcon category={file.category} />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <p className="text-white text-sm font-medium truncate">
                    {file.filename}
                  </p>
                  <p className="text-white/80 text-xs">
                    {file.uploadedAt &&
                      new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                {file.isFavorite && (
                  <div className="absolute top-2 right-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-8 text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No files yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start building your wedding memory collection
              </p>
              <Button
                onClick={onUpload}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Photo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Timeline Moments */}
      {recentMoments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Timeline
          </h3>
          <div className="space-y-3">
            {recentMoments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {moment.files &&
                      moment.files[0] &&
                      moment.files[0].thumbnailUrl ? (
                        <img
                          src={moment.files[0].thumbnailUrl}
                          alt={moment.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="w-6 h-6 text-gray-500" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate mb-1">
                          {moment.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {moment.description}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {moment.timestamp.toLocaleDateString()}
                          </span>
                          {moment.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {moment.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => onShare?.(recentFiles.slice(0, 4))}
          className="h-12"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Recent
        </Button>
        <Button variant="outline" className="h-12">
          <Calendar className="w-4 h-4 mr-2" />
          Wedding Day
        </Button>
      </div>
    </motion.div>
  );
};

// Additional view components would be implemented similarly
const SharingView: React.FC<any> = () => <div>Sharing View</div>;
const ProfileView: React.FC<any> = () => <div>Profile View</div>;

function getFileIcon(category: string) {
  switch (category) {
    case 'photos':
      return <Camera className="w-8 h-8 text-gray-500" />;
    case 'videos':
      return <Video className="w-8 h-8 text-gray-500" />;
    case 'documents':
      return <FileText className="w-8 h-8 text-gray-500" />;
    case 'audio':
      return <Music className="w-8 h-8 text-gray-500" />;
    default:
      return <Camera className="w-8 h-8 text-gray-500" />;
  }
}

export default MobileWedMeLayout;
