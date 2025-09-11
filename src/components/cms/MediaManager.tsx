'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CMSMedia, MediaManagerProps, CMSPerformanceMetric } from '@/types/cms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Image,
  Video,
  File,
  Trash2,
  Search,
  Grid3x3,
  List,
  Download,
  Compress,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'compressing' | 'completed' | 'error';
  compressedSize?: number;
  compressionRatio?: number;
  uploadTime?: number;
}

interface MediaFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'document';
  sortBy: 'date' | 'name' | 'size';
  sortOrder: 'asc' | 'desc';
}

export function MediaManager({
  onUpload,
  onSelect,
  allowMultiple = false,
  acceptTypes = ['image/*', 'video/*', 'application/pdf'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  enableCompression = true,
  mobileOptimized = true,
}: MediaManagerProps) {
  const [media, setMedia] = useState<CMSMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<CMSMedia[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<MediaFilters>({
    search: '',
    type: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    totalUploads: number;
    avgCompressionRatio: number;
    avgUploadTime: number;
    totalSaved: number;
  }>({
    totalUploads: 0,
    avgCompressionRatio: 0,
    avgUploadTime: 0,
    totalSaved: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load existing media
  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cms/media');
      if (response.ok) {
        const data = await response.json();
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error('Failed to load media library');
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = async (file: File, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions for mobile
        const MAX_WIDTH = mobileOptimized ? 1200 : 1920;
        const MAX_HEIGHT = mobileOptimized ? 1200 : 1080;

        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality,
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      if (file.size > maxFileSize) {
        toast.error(
          `${file.name} is too large (max ${maxFileSize / 1024 / 1024}MB)`,
        );
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Initialize upload progress
    const initialProgress: UploadProgress[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadProgress(initialProgress);

    try {
      const uploadResults: CMSMedia[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const startTime = Date.now();

        // Update progress to compression phase
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: 'compressing' as const, progress: 20 }
              : p,
          ),
        );

        let processedFile = file;
        let compressionRatio = 0;

        // Compress images if enabled
        if (enableCompression && file.type.startsWith('image/')) {
          const compressedFile = await compressImage(file);
          compressionRatio =
            ((file.size - compressedFile.size) / file.size) * 100;
          processedFile = compressedFile;

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    progress: 50,
                    compressedSize: compressedFile.size,
                    compressionRatio,
                  }
                : p,
            ),
          );
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('original_name', file.name);
        formData.append('compression_ratio', compressionRatio.toString());

        const response = await fetch('/api/cms/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const uploadTime = Date.now() - startTime;

          uploadResults.push(result.media);

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    status: 'completed' as const,
                    progress: 100,
                    uploadTime,
                  }
                : p,
            ),
          );

          // Update performance metrics
          setPerformanceMetrics((prev) => ({
            totalUploads: prev.totalUploads + 1,
            avgCompressionRatio:
              (prev.avgCompressionRatio + compressionRatio) / 2,
            avgUploadTime: (prev.avgUploadTime + uploadTime) / 2,
            totalSaved: prev.totalSaved + (file.size - processedFile.size),
          }));
        } else {
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: 'error' as const } : p,
            ),
          );
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadResults.length > 0) {
        setMedia((prev) => [...uploadResults, ...prev]);
        if (onUpload) {
          await onUpload(validFiles);
        }
        toast.success(`Successfully uploaded ${uploadResults.length} file(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      // Clear upload progress after 3 seconds
      setTimeout(() => setUploadProgress([]), 3000);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const selectMedia = (mediaItem: CMSMedia) => {
    if (allowMultiple) {
      const isSelected = selectedMedia.some((m) => m.id === mediaItem.id);
      if (isSelected) {
        setSelectedMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
      } else {
        setSelectedMedia((prev) => [...prev, mediaItem]);
      }
    } else {
      setSelectedMedia([mediaItem]);
    }
  };

  const confirmSelection = () => {
    if (onSelect && selectedMedia.length > 0) {
      onSelect(selectedMedia);
      setSelectedMedia([]);
    }
  };

  const deleteMedia = async (mediaItem: CMSMedia) => {
    try {
      const response = await fetch(`/api/cms/media/${mediaItem.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
        setSelectedMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
        toast.success('Media deleted successfully');
      } else {
        toast.error('Failed to delete media');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete media');
    }
  };

  const filteredMedia = media
    .filter((item) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (
          !item.original_name.toLowerCase().includes(searchTerm) &&
          !item.alt_text?.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      // Type filter
      if (filters.type !== 'all') {
        if (filters.type === 'image' && !item.mime_type.startsWith('image/'))
          return false;
        if (filters.type === 'video' && !item.mime_type.startsWith('video/'))
          return false;
        if (filters.type === 'document' && !item.mime_type.includes('pdf'))
          return false;
      }

      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'name':
          compareValue = a.original_name.localeCompare(b.original_name);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
        case 'date':
        default:
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="w-full h-full bg-background">
      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadProgress.map((upload, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">
                    {upload.file.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    {upload.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {upload.status === 'uploading' && (
                      <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                    {upload.status === 'compressing' && (
                      <Compress className="h-4 w-4 text-yellow-500 animate-pulse" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {upload.compressionRatio &&
                        upload.compressionRatio > 0 &&
                        `${upload.compressionRatio.toFixed(1)}% saved`}
                    </span>
                  </div>
                </div>
                <Progress value={upload.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">
                {performanceMetrics.totalUploads}
              </div>
              <div className="text-muted-foreground">Total Uploads</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {performanceMetrics.avgCompressionRatio.toFixed(1)}%
              </div>
              <div className="text-muted-foreground">Avg Compression</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {(performanceMetrics.avgUploadTime / 1000).toFixed(1)}s
              </div>
              <div className="text-muted-foreground">Avg Upload Time</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {formatFileSize(performanceMetrics.totalSaved)}
              </div>
              <div className="text-muted-foreground">Space Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'hover:border-primary/50 hover:bg-primary/5',
              'touch-manipulation',
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports {acceptTypes.join(', ')} up to{' '}
              {formatFileSize(maxFileSize)}
            </p>
            {enableCompression && (
              <Badge variant="secondary" className="mb-2">
                <Compress className="h-3 w-3 mr-1" />
                Auto-compression enabled
              </Badge>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple={allowMultiple}
            accept={acceptTypes.join(',')}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9 w-64"
            />
          </div>

          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value as any }))
            }
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {selectedMedia.length > 0 && (
            <Button onClick={confirmSelection} size="sm">
              Select {selectedMedia.length} item
              {selectedMedia.length > 1 ? 's' : ''}
            </Button>
          )}

          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
      {isLoading ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading media library...</p>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1',
          )}
        >
          {filteredMedia.map((item) => {
            const isSelected = selectedMedia.some((m) => m.id === item.id);

            return (
              <Card
                key={item.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-primary',
                  'touch-manipulation',
                )}
                onClick={() => selectMedia(item)}
              >
                <CardContent className="p-4">
                  {viewMode === 'grid' ? (
                    <div className="space-y-2">
                      {item.mime_type.startsWith('image/') ? (
                        <div className="aspect-square bg-muted rounded-md overflow-hidden">
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.alt_text || item.original_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                          {getFileIcon(item.mime_type)}
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-sm font-medium truncate">
                          {item.original_name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatFileSize(item.size)}</span>
                          {item.compression_ratio &&
                            item.compression_ratio > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                -{item.compression_ratio.toFixed(0)}%
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        {item.mime_type.startsWith('image/') ? (
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.alt_text || item.original_name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          getFileIcon(item.mime_type)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.original_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(item.size)} •{' '}
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.compression_ratio &&
                          item.compression_ratio > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              -{item.compression_ratio.toFixed(0)}%
                            </Badge>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMedia(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredMedia.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No media found</p>
          <p className="text-muted-foreground">
            Upload some files to get started
          </p>
        </div>
      )}
    </div>
  );
}
