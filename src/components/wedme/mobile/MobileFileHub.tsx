'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileImage,
  Video,
  Music,
  FileText,
  Heart,
  Users,
  Share2,
  MoreVertical,
  Search,
  Grid,
  List,
  Filter,
  Download,
  Upload,
  Star,
  Clock,
  Eye,
  MessageCircle,
  Send,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  WeddingFile,
  CoupleProfile,
  FileCategory,
  SharingGroup,
  TimelineMoment,
} from '@/types/wedme/file-management';
import {
  ImageOptimizer,
  LazyLoader,
  ProgressiveLoader,
} from '@/lib/wedme/performance-optimization';

interface MobileFileHubProps {
  couple: CoupleProfile;
  files: WeddingFile[];
  onFileSelect?: (file: WeddingFile) => void;
  onShare?: (files: WeddingFile[], groups: SharingGroup[]) => void;
  onUpload?: () => void;
}

export const MobileFileHub: React.FC<MobileFileHubProps> = ({
  couple,
  files,
  onFileSelect,
  onShare,
  onUpload,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    FileCategory | 'all'
  >('all');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'all' | 'recent' | 'favorites' | 'shared'
  >('all');

  // Progressive loading for large file lists
  const [visibleFiles, setVisibleFiles] = useState<WeddingFile[]>([]);
  const progressiveLoader = useMemo(() => new ProgressiveLoader(), []);

  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);

      const filteredFiles = files.filter((file) => {
        const matchesSearch =
          file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          );
        const matchesCategory =
          selectedCategory === 'all' || file.category === selectedCategory;
        const matchesTab =
          activeTab === 'all' ||
          (activeTab === 'recent' &&
            file.uploadedAt &&
            new Date(file.uploadedAt) >
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
          (activeTab === 'favorites' && file.isFavorite) ||
          (activeTab === 'shared' &&
            file.sharedWith &&
            file.sharedWith.length > 0);

        return matchesSearch && matchesCategory && matchesTab;
      });

      const loaded = await progressiveLoader.loadBatch(filteredFiles, {
        batchSize: 20,
        loadDelay: 50,
        onProgress: (progress) => {
          // Update loading state
        },
      });

      setVisibleFiles(loaded);
      setIsLoading(false);
    };

    loadFiles();
  }, [files, searchQuery, selectedCategory, activeTab, progressiveLoader]);

  const categories: {
    key: FileCategory | 'all';
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { key: 'all', label: 'All', icon: Grid, count: files.length },
    {
      key: 'photos',
      label: 'Photos',
      icon: FileImage,
      count: files.filter((f) => f.category === 'photos').length,
    },
    {
      key: 'videos',
      label: 'Videos',
      icon: Video,
      count: files.filter((f) => f.category === 'videos').length,
    },
    {
      key: 'documents',
      label: 'Docs',
      icon: FileText,
      count: files.filter((f) => f.category === 'documents').length,
    },
    {
      key: 'audio',
      label: 'Audio',
      icon: Music,
      count: files.filter((f) => f.category === 'audio').length,
    },
  ];

  const handleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const getFileIcon = (category: FileCategory) => {
    switch (category) {
      case 'photos':
        return FileImage;
      case 'videos':
        return Video;
      case 'documents':
        return FileText;
      case 'audio':
        return Music;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-rose-50 to-pink-50 safe-area-inset">
      {/* Mobile Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rose-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {couple.partnerOne.firstName} & {couple.partnerTwo.firstName}
            </h1>
            <p className="text-sm text-gray-600">
              {files.length} wedding memories
            </p>
          </div>
          <Button
            onClick={onUpload}
            size="sm"
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search photos, videos, documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          {categories.map(({ key, label, icon: Icon, count }) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 ${
                selectedCategory === key
                  ? 'bg-rose-500 text-white'
                  : 'text-gray-600 hover:bg-rose-50'
              }`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {label}{' '}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {(['all', 'recent', 'favorites', 'shared'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* File Grid/List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {visibleFiles.map((file, index) => (
                    <MobileFileCard
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles.includes(file.id)}
                      onSelect={() => handleFileSelection(file.id)}
                      onClick={() => onFileSelect?.(file)}
                      index={index}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {visibleFiles.map((file, index) => (
                    <MobileFileListItem
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles.includes(file.id)}
                      onSelect={() => handleFileSelection(file.id)}
                      onClick={() => onFileSelect?.(file)}
                      index={index}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {visibleFiles.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No files found
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or upload some wedding memories
              </p>
              <Button
                onClick={onUpload}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 safe-area-inset-bottom"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900">
                {selectedFiles.length} selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFiles([])}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const selected = files.filter((f) =>
                    selectedFiles.includes(f.id),
                  );
                  onShare?.(selected, []);
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* View Mode Toggle */}
      <div className="fixed bottom-20 right-4 safe-area-inset-bottom">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200"
        >
          {viewMode === 'grid' ? (
            <List className="w-4 h-4" />
          ) : (
            <Grid className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

interface MobileFileCardProps {
  file: WeddingFile;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  index: number;
}

const MobileFileCard: React.FC<MobileFileCardProps> = ({
  file,
  isSelected,
  onSelect,
  onClick,
  index,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');

  useEffect(() => {
    const loadOptimizedImage = async () => {
      if (file.category === 'photos' && file.thumbnailUrl) {
        try {
          // Create a blob from the thumbnail URL for optimization
          const response = await fetch(file.thumbnailUrl);
          const blob = await response.blob();
          const file_obj = new File([blob], 'thumbnail', { type: blob.type });

          const { optimized } = await ImageOptimizer.optimizeImage(
            file_obj,
            'mobile',
          );
          const url = URL.createObjectURL(optimized);
          setOptimizedSrc(url);
        } catch (error) {
          setOptimizedSrc(file.thumbnailUrl || '');
        }
      }
    };

    loadOptimizedImage();
  }, [file.thumbnailUrl, file.category]);

  const Icon = getFileIcon(file.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <Card
        className={`overflow-hidden cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-rose-500 bg-rose-50' : 'hover:shadow-md'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="aspect-square relative">
            {file.category === 'photos' ? (
              <LazyLoader threshold={0.1}>
                <div className="relative w-full h-full">
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                  )}
                  <img
                    src={optimizedSrc || file.thumbnailUrl}
                    alt={file.filename}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    loading="lazy"
                  />
                </div>
              </LazyLoader>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Icon className="w-8 h-8 text-gray-500" />
              </div>
            )}

            {/* Selection Overlay */}
            <div
              className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white bg-white/90 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected && (
                <div className="w-3 h-3 rounded-full bg-rose-500" />
              )}
            </div>

            {/* File Type Badge */}
            <div className="absolute bottom-2 left-2">
              <Badge
                variant="secondary"
                className="text-xs bg-black/60 text-white border-none"
              >
                {file.category}
              </Badge>
            </div>

            {/* Favorite Star */}
            {file.isFavorite && (
              <Star className="absolute top-2 left-2 w-4 h-4 text-yellow-500 fill-current" />
            )}
          </div>

          {/* File Info */}
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900 truncate mb-1">
              {file.filename}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              {file.uploadedAt && (
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface MobileFileListItemProps {
  file: WeddingFile;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  index: number;
}

const MobileFileListItem: React.FC<MobileFileListItemProps> = ({
  file,
  isSelected,
  onSelect,
  onClick,
  index,
}) => {
  const Icon = getFileIcon(file.category);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-rose-500 bg-rose-50' : 'hover:shadow-sm'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {/* File Thumbnail/Icon */}
            <div className="flex-shrink-0">
              {file.category === 'photos' && file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.filename}
                  className="w-12 h-12 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.filename}
                </p>
                {file.isFavorite && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                {file.uploadedAt && (
                  <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                )}
                <Badge variant="secondary" className="text-xs">
                  {file.category}
                </Badge>
              </div>
            </div>

            {/* Selection Circle */}
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected && (
                <div className="w-3 h-3 rounded-full bg-rose-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

function getFileIcon(category: FileCategory): React.ElementType {
  switch (category) {
    case 'photos':
      return FileImage;
    case 'videos':
      return Video;
    case 'documents':
      return FileText;
    case 'audio':
      return Music;
    default:
      return FileText;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default MobileFileHub;
