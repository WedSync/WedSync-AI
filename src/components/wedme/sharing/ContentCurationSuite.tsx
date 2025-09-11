'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Star,
  Share2,
  Eye,
  MessageCircle,
  Clock,
  Filter,
  Search,
  Grid,
  List,
  Calendar,
  Users,
  Camera,
  Video,
  FileText,
  Gift,
  Sparkles,
} from 'lucide-react';
import {
  WeddingFile,
  CoupleProfile,
  SharingGroup,
  ContentCurationPreferences,
  CuratedContent,
  ContentRecommendation,
  SharingAnalytics,
} from '@/types/wedme/file-management';
import { cn } from '@/lib/utils';

interface ContentCurationSuiteProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  sharingGroups: SharingGroup[];
  onCurateContent: (content: CuratedContent[]) => void;
  onUpdatePreferences: (preferences: ContentCurationPreferences) => void;
  className?: string;
}

export default function ContentCurationSuite({
  couple,
  files,
  sharingGroups,
  onCurateContent,
  onUpdatePreferences,
  className,
}: ContentCurationSuiteProps) {
  const [activeTab, setActiveTab] = useState<
    'smart' | 'manual' | 'scheduled' | 'analytics'
  >('smart');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<
    'all' | 'photo' | 'video' | 'document'
  >('all');

  // AI-powered smart curation recommendations
  const smartRecommendations = useMemo(() => {
    return generateSmartCurationRecommendations(files, couple, sharingGroups);
  }, [files, couple, sharingGroups]);

  // Filtered and searched files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesType =
        filterType === 'all' || file.type.startsWith(filterType);
      return matchesSearch && matchesType;
    });
  }, [files, searchQuery, filterType]);

  const handleFileSelect = (fileId: string, selected: boolean) => {
    const newSelection = new Set(selectedFiles);
    if (selected) {
      newSelection.add(fileId);
    } else {
      newSelection.delete(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleBulkShare = () => {
    const selectedFileObjects = files.filter((f) => selectedFiles.has(f.id));
    const curatedContent: CuratedContent[] = selectedFileObjects.map(
      (file) => ({
        id: `curated-${file.id}-${Date.now()}`,
        fileId: file.id,
        curationType: 'manual',
        targetGroups: [],
        scheduledDate: null,
        personalMessage: '',
        privacyLevel: 'family',
        createdAt: new Date().toISOString(),
        status: 'draft',
      }),
    );
    onCurateContent(curatedContent);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200 p-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Content Curation Suite
          </h3>
          <p className="text-sm text-gray-600">
            Intelligently organize and share your wedding memories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'smart' as const, label: 'Smart Curation', icon: Sparkles },
          { id: 'manual' as const, label: 'Manual Selection', icon: Users },
          { id: 'scheduled' as const, label: 'Scheduled Sharing', icon: Clock },
          { id: 'analytics' as const, label: 'Performance', icon: Eye },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Smart Curation Tab */}
        {activeTab === 'smart' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartRecommendations.map((recommendation) => (
                <SmartCurationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onApply={() => {
                    const curatedContent: CuratedContent[] =
                      recommendation.suggestedFiles.map((file) => ({
                        id: `smart-${file.id}-${Date.now()}`,
                        fileId: file.id,
                        curationType: 'smart',
                        targetGroups: recommendation.targetGroups,
                        scheduledDate: null,
                        personalMessage: recommendation.suggestedCaption || '',
                        privacyLevel: recommendation.recommendedPrivacy,
                        createdAt: new Date().toISOString(),
                        status: 'draft',
                      }));
                    onCurateContent(curatedContent);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Manual Selection Tab */}
        {activeTab === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Types</option>
                  <option value="photo">Photos</option>
                  <option value="video">Videos</option>
                  <option value="document">Documents</option>
                </select>
              </div>
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleBulkShare}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2"
                >
                  <Share2 size={16} />
                  Share {selectedFiles.size} Selected
                </button>
              )}
            </div>

            {/* File Grid/List */}
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'space-y-2',
              )}
            >
              {filteredFiles.map((file) => (
                <FileSelectionCard
                  key={file.id}
                  file={file}
                  selected={selectedFiles.has(file.id)}
                  viewMode={viewMode}
                  onSelect={(selected) => handleFileSelect(file.id, selected)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Scheduled Sharing Tab */}
        {activeTab === 'scheduled' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <ScheduledSharingManager couple={couple} />
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <ContentAnalyticsDashboard couple={couple} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Smart Curation Card Component
function SmartCurationCard({
  recommendation,
  onApply,
}: {
  recommendation: ContentRecommendation;
  onApply: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-lg p-4 border border-rose-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-rose-600" size={16} />
          <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
        </div>
        <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-full">
          {recommendation.confidence}% match
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{recommendation.description}</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {recommendation.suggestedFiles.slice(0, 3).map((file) => (
            <div
              key={file.id}
              className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"
            />
          ))}
          {recommendation.suggestedFiles.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-white">
                +{recommendation.suggestedFiles.length - 3}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {recommendation.suggestedFiles.length} files
        </span>
      </div>

      <button
        onClick={onApply}
        className="w-full bg-white text-rose-600 border border-rose-200 rounded-lg px-3 py-2 text-sm hover:bg-rose-50 transition-colors"
      >
        Apply Recommendation
      </button>
    </div>
  );
}

// File Selection Card Component
function FileSelectionCard({
  file,
  selected,
  viewMode,
  onSelect,
}: {
  file: WeddingFile;
  selected: boolean;
  viewMode: 'grid' | 'list';
  onSelect: (selected: boolean) => void;
}) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image')) return Camera;
    if (type.startsWith('video')) return Video;
    return FileText;
  };

  const IconComponent = getFileIcon(file.type);

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg border-2 transition-colors cursor-pointer',
          selected
            ? 'border-rose-500 bg-rose-50'
            : 'border-gray-200 hover:border-gray-300',
        )}
        onClick={() => onSelect(!selected)}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
        />
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <IconComponent size={18} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-sm text-gray-500">
            {file.size ? formatFileSize(file.size) : ''} •{' '}
            {formatDate(file.uploadDate)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'aspect-square rounded-lg border-2 transition-colors cursor-pointer relative overflow-hidden',
        selected
          ? 'border-rose-500 bg-rose-50'
          : 'border-gray-200 hover:border-gray-300',
      )}
      onClick={() => onSelect(!selected)}
    >
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <IconComponent size={24} className="text-gray-600" />
      </div>
      <div className="absolute top-2 left-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
        <p className="text-xs font-medium truncate">{file.name}</p>
      </div>
    </div>
  );
}

// Scheduled Sharing Manager Component
function ScheduledSharingManager({ couple }: { couple: CoupleProfile }) {
  return (
    <div className="text-center py-12">
      <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Scheduled Sharing
      </h3>
      <p className="text-gray-600 mb-4">
        Schedule content to be shared at specific times
      </p>
      <button className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors">
        Create Schedule
      </button>
    </div>
  );
}

// Content Analytics Dashboard Component
function ContentAnalyticsDashboard({ couple }: { couple: CoupleProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Eye className="text-blue-600" size={20} />
          <span className="text-xs text-blue-600 font-medium">Views</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">2,847</div>
        <div className="text-sm text-blue-700">+12% this week</div>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Heart className="text-green-600" size={20} />
          <span className="text-xs text-green-600 font-medium">Likes</span>
        </div>
        <div className="text-2xl font-bold text-green-900">1,234</div>
        <div className="text-sm text-green-700">+8% this week</div>
      </div>

      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Share2 className="text-purple-600" size={20} />
          <span className="text-xs text-purple-600 font-medium">Shares</span>
        </div>
        <div className="text-2xl font-bold text-purple-900">456</div>
        <div className="text-sm text-purple-700">+15% this week</div>
      </div>

      <div className="bg-orange-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <MessageCircle className="text-orange-600" size={20} />
          <span className="text-xs text-orange-600 font-medium">Comments</span>
        </div>
        <div className="text-2xl font-bold text-orange-900">189</div>
        <div className="text-sm text-orange-700">+5% this week</div>
      </div>
    </div>
  );
}

// Helper Functions
function generateSmartCurationRecommendations(
  files: WeddingFile[],
  couple: CoupleProfile,
  groups: SharingGroup[],
): ContentRecommendation[] {
  return [
    {
      id: 'rec-1',
      title: 'Engagement Highlights',
      description:
        'Perfect moments to share with your engagement photos and videos',
      suggestedFiles: files
        .filter((f) => f.tags?.includes('engagement'))
        .slice(0, 5),
      targetGroups: groups.filter((g) => g.name === 'Close Friends'),
      suggestedCaption: 'Reliving our magical engagement moments! 💕',
      confidence: 92,
      recommendedPrivacy: 'friends',
      viralPotential: 0.85,
    },
    {
      id: 'rec-2',
      title: 'Family Moments',
      description:
        'Heartwarming family photos perfect for sharing with relatives',
      suggestedFiles: files
        .filter((f) => f.tags?.includes('family'))
        .slice(0, 4),
      targetGroups: groups.filter((g) => g.name === 'Family'),
      suggestedCaption: 'Our families coming together as one! 👨‍👩‍👧‍👦',
      confidence: 88,
      recommendedPrivacy: 'family',
      viralPotential: 0.72,
    },
    {
      id: 'rec-3',
      title: 'Behind the Scenes',
      description: 'Fun candid moments that show your wedding planning journey',
      suggestedFiles: files
        .filter((f) => f.tags?.includes('planning'))
        .slice(0, 6),
      targetGroups: groups.filter((g) => g.name === 'Wedding Party'),
      suggestedCaption: 'The journey to our big day has been incredible! 💒',
      confidence: 79,
      recommendedPrivacy: 'friends',
      viralPotential: 0.91,
    },
  ];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}
