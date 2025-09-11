'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Image,
  Film,
  FileText,
  Music,
  Archive,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Eye,
  Users,
  Tag,
  Clock,
  FileIcon,
  Zap,
} from 'lucide-react';
import {
  FileSystemFile,
  WeddingFileCategory,
  FileProcessingStatus,
  AIAnalysisResult,
  UploadProgress,
  WeddingContext,
} from '@/types/file-management';
import { cn } from '@/lib/utils';
import {
  uploadFileWithAI,
  generateThumbnail,
  extractMetadata,
} from '@/lib/storage';
import {
  categorizeFile,
  detectFaces,
  recognizeScene,
  analyzeImageQuality,
} from '@/lib/ai-analysis';

interface AdvancedFileUploadProps {
  organizationId: string;
  weddingContext?: WeddingContext;
  onUploadComplete: (files: FileSystemFile[]) => void;
  onUploadProgress: (progress: UploadProgress) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  enableAI?: boolean;
  enableBulkProcessing?: boolean;
}

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: FileProcessingStatus;
  error?: string;
  aiAnalysis?: AIAnalysisResult;
  preview?: string;
  thumbnail?: string;
  category?: WeddingFileCategory;
}

const FILE_CATEGORY_ICONS = {
  [WeddingFileCategory.CEREMONY_PHOTOS]: Image,
  [WeddingFileCategory.RECEPTION_PHOTOS]: Image,
  [WeddingFileCategory.PREPARATION_PHOTOS]: Image,
  [WeddingFileCategory.COUPLE_PORTRAITS]: Image,
  [WeddingFileCategory.FAMILY_PORTRAITS]: Image,
  [WeddingFileCategory.DETAIL_SHOTS]: Image,
  [WeddingFileCategory.CEREMONY_VIDEO]: Film,
  [WeddingFileCategory.RECEPTION_VIDEO]: Film,
  [WeddingFileCategory.SPEECHES_VIDEO]: Film,
  [WeddingFileCategory.CONTRACTS]: FileText,
  [WeddingFileCategory.INVOICES]: FileText,
  [WeddingFileCategory.TIMELINE]: FileText,
  [WeddingFileCategory.GUEST_LIST]: FileText,
  [WeddingFileCategory.MUSIC_PLAYLIST]: Music,
  [WeddingFileCategory.VENDOR_FILES]: Archive,
  [WeddingFileCategory.MISC]: FileIcon,
};

export default function AdvancedFileUpload({
  organizationId,
  weddingContext,
  onUploadComplete,
  onUploadProgress,
  maxFiles = 100,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
  ],
  enableAI = true,
  enableBulkProcessing = true,
}: AdvancedFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<
    'smart' | 'fast' | 'detailed'
  >('smart');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFileWithAI = useCallback(
    async (file: File, uploadId: string) => {
      if (!enableAI) return null;

      try {
        const aiResults: Partial<AIAnalysisResult> = {};

        // Smart categorization based on filename and content
        const suggestedCategory = await categorizeFile(file, weddingContext);
        aiResults.suggestedCategory = suggestedCategory;

        // Image-specific AI analysis
        if (file.type.startsWith('image/')) {
          if (processingMode === 'detailed' || processingMode === 'smart') {
            // Face detection and recognition
            const faces = await detectFaces(file);
            aiResults.faces = faces;

            // Scene recognition
            const sceneData = await recognizeScene(file);
            aiResults.sceneRecognition = sceneData;

            // Quality analysis
            const qualityData = await analyzeImageQuality(file);
            aiResults.qualityScore = qualityData.score;
            aiResults.technicalIssues = qualityData.issues;
          }

          // Generate smart tags
          aiResults.smartTags = await generateSmartTags(file, weddingContext);
        }

        // Wedding-specific analysis
        if (weddingContext) {
          aiResults.weddingMoments = await detectWeddingMoments(
            file,
            weddingContext,
          );
          aiResults.vendorAttribution = await attributeToVendor(
            file,
            weddingContext,
          );
        }

        return aiResults as AIAnalysisResult;
      } catch (error) {
        console.error('AI analysis failed:', error);
        return null;
      }
    },
    [enableAI, processingMode, weddingContext],
  );

  const processFile = useCallback(
    async (file: File) => {
      const uploadId = crypto.randomUUID();

      const uploadingFile: UploadingFile = {
        file,
        id: uploadId,
        progress: 0,
        status: FileProcessingStatus.UPLOADING,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      };

      setUploadingFiles((prev) => [...prev, uploadingFile]);

      try {
        // Step 1: Upload file with progress tracking
        const uploadResult = await uploadFileWithAI(file, {
          organizationId,
          weddingContext,
          onProgress: (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadId
                  ? { ...f, progress: Math.round(progress * 30) }
                  : f,
              ),
            );
          },
        });

        // Step 2: Generate thumbnail
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? {
                  ...f,
                  status: FileProcessingStatus.GENERATING_THUMBNAIL,
                  progress: 35,
                }
              : f,
          ),
        );

        const thumbnail = await generateThumbnail(uploadResult.path, file.type);

        // Step 3: Extract metadata
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? {
                  ...f,
                  status: FileProcessingStatus.EXTRACTING_METADATA,
                  progress: 50,
                }
              : f,
          ),
        );

        const metadata = await extractMetadata(file);

        // Step 4: AI Analysis
        if (enableAI) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId
                ? {
                    ...f,
                    status: FileProcessingStatus.AI_ANALYSIS,
                    progress: 60,
                  }
                : f,
            ),
          );

          const aiAnalysis = await processFileWithAI(file, uploadId);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId
                ? {
                    ...f,
                    aiAnalysis,
                    category: aiAnalysis?.suggestedCategory,
                    progress: 90,
                  }
                : f,
            ),
          );
        }

        // Step 5: Finalize
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, status: FileProcessingStatus.COMPLETED, progress: 100 }
              : f,
          ),
        );

        const fileSystemFile: FileSystemFile = {
          id: uploadResult.id,
          name: file.name,
          path: uploadResult.path,
          size: file.size,
          mimeType: file.type,
          organizationId,
          uploadedBy: 'current-user', // TODO: Get from auth
          uploadedAt: new Date(),
          category: uploadingFile.category || WeddingFileCategory.MISC,
          tags: aiAnalysis?.smartTags || [],
          metadata: {
            ...metadata,
            aiAnalysis: aiAnalysis || undefined,
            thumbnail: thumbnail || undefined,
          },
          weddingContext,
          isProcessing: false,
          processingStatus: FileProcessingStatus.COMPLETED,
        };

        // Remove from uploading list after delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        }, 2000);

        return fileSystemFile;
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? {
                  ...f,
                  status: FileProcessingStatus.ERROR,
                  error:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : f,
          ),
        );
        throw error;
      }
    },
    [organizationId, weddingContext, enableAI, processFileWithAI],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Validate file limits
      if (acceptedFiles.length + uploadingFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate file sizes
      const oversizedFiles = acceptedFiles.filter(
        (file) => file.size > maxFileSize,
      );
      if (oversizedFiles.length > 0) {
        alert(
          `Files too large: ${oversizedFiles.map((f) => f.name).join(', ')}`,
        );
        return;
      }

      if (enableBulkProcessing && acceptedFiles.length > 5) {
        setBulkProcessing(true);
      }

      try {
        const processedFiles: FileSystemFile[] = [];

        if (enableBulkProcessing && acceptedFiles.length > 5) {
          // Process files in parallel batches
          const batchSize = 3;
          for (let i = 0; i < acceptedFiles.length; i += batchSize) {
            const batch = acceptedFiles.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map((file) =>
                processFile(file).catch((error) => {
                  console.error(`Failed to process ${file.name}:`, error);
                  return null;
                }),
              ),
            );

            processedFiles.push(
              ...(batchResults.filter(Boolean) as FileSystemFile[]),
            );

            // Update overall progress
            const totalProgress =
              ((i + batch.length) / acceptedFiles.length) * 100;
            onUploadProgress({
              totalFiles: acceptedFiles.length,
              completedFiles: i + batch.length,
              currentFile: batch[batch.length - 1]?.name || '',
              progress: totalProgress,
              status: 'processing',
            });
          }
        } else {
          // Process files sequentially
          for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            try {
              const processedFile = await processFile(file);
              processedFiles.push(processedFile);

              onUploadProgress({
                totalFiles: acceptedFiles.length,
                completedFiles: i + 1,
                currentFile: file.name,
                progress: ((i + 1) / acceptedFiles.length) * 100,
                status: 'processing',
              });
            } catch (error) {
              console.error(`Failed to process ${file.name}:`, error);
            }
          }
        }

        setBulkProcessing(false);
        onUploadComplete(processedFiles);

        onUploadProgress({
          totalFiles: acceptedFiles.length,
          completedFiles: processedFiles.length,
          currentFile: '',
          progress: 100,
          status: 'completed',
        });
      } catch (error) {
        setBulkProcessing(false);
        console.error('Upload process failed:', error);
      }
    },
    [
      uploadingFiles.length,
      maxFiles,
      maxFileSize,
      enableBulkProcessing,
      processFile,
      onUploadComplete,
      onUploadProgress,
    ],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce(
      (acc, type) => {
        acc[type] = [];
        return acc;
      },
      {} as Record<string, string[]>,
    ),
    maxFiles,
    maxSize: maxFileSize,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const getStatusIcon = (status: FileProcessingStatus) => {
    switch (status) {
      case FileProcessingStatus.COMPLETED:
        return <Check className="w-4 h-4 text-green-600" />;
      case FileProcessingStatus.ERROR:
        return <X className="w-4 h-4 text-red-600" />;
      case FileProcessingStatus.AI_ANALYSIS:
        return <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />;
      default:
        return <Upload className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusText = (status: FileProcessingStatus) => {
    switch (status) {
      case FileProcessingStatus.UPLOADING:
        return 'Uploading...';
      case FileProcessingStatus.GENERATING_THUMBNAIL:
        return 'Creating thumbnail...';
      case FileProcessingStatus.EXTRACTING_METADATA:
        return 'Reading metadata...';
      case FileProcessingStatus.AI_ANALYSIS:
        return 'AI analysis...';
      case FileProcessingStatus.COMPLETED:
        return 'Complete';
      case FileProcessingStatus.ERROR:
        return 'Failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Processing Controls */}
      {enableAI && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Processing Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={processingMode}
              onValueChange={(value) =>
                setProcessingMode(value as typeof processingMode)
              }
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fast" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Fast
                </TabsTrigger>
                <TabsTrigger value="smart" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Smart
                </TabsTrigger>
                <TabsTrigger
                  value="detailed"
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Detailed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fast" className="mt-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Fast Processing</p>
                  <p>
                    Basic categorization and metadata extraction only. Best for
                    large batches.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">Auto-categorize</Badge>
                    <Badge variant="secondary">Metadata</Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="smart" className="mt-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Smart Processing (Recommended)</p>
                  <p>
                    Intelligent analysis with face detection and scene
                    recognition for photos.
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">Auto-categorize</Badge>
                    <Badge variant="secondary">Face detection</Badge>
                    <Badge variant="secondary">Scene analysis</Badge>
                    <Badge variant="secondary">Smart tags</Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="mt-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Detailed Analysis</p>
                  <p>
                    Complete AI analysis including quality scoring and detailed
                    metadata.
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">Everything above</Badge>
                    <Badge variant="secondary">Quality scoring</Badge>
                    <Badge variant="secondary">Wedding moments</Badge>
                    <Badge variant="secondary">Vendor attribution</Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive && 'border-blue-500 bg-blue-50',
            dragActive && 'border-blue-500 bg-blue-50',
          )}
        >
          <input {...getInputProps()} ref={inputRef} />

          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop files here...' : 'Upload Wedding Files'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop files here, or click to browse
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline">Photos</Badge>
              <Badge variant="outline">Videos</Badge>
              <Badge variant="outline">Documents</Badge>
              <Badge variant="outline">Audio</Badge>
            </div>

            <p className="text-xs text-gray-400">
              Maximum {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)}
              MB each
            </p>

            <Button variant="outline" type="button">
              Browse Files
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Processing Status */}
      {bulkProcessing && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Processing multiple files in batches for optimal performance...
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Processing Files</span>
              <Badge variant="outline">
                {
                  uploadingFiles.filter(
                    (f) => f.status === FileProcessingStatus.COMPLETED,
                  ).length
                }{' '}
                / {uploadingFiles.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadingFiles.map((file) => {
              const CategoryIcon = file.category
                ? FILE_CATEGORY_ICONS[file.category]
                : FileIcon;

              return (
                <div key={file.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <CategoryIcon className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.status)}
                        <span className="text-xs text-gray-500">
                          {getStatusText(file.status)}
                        </span>
                      </div>
                    </div>

                    <Progress value={file.progress} className="mt-2" />

                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}

                    {file.aiAnalysis && (
                      <div className="flex gap-1 mt-2">
                        {file.aiAnalysis.smartTags?.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {file.aiAnalysis.faces &&
                          file.aiAnalysis.faces.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {file.aiAnalysis.faces.length}
                            </Badge>
                          )}
                        {file.category && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {file.category.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// AI Analysis Helper Functions
async function generateSmartTags(
  file: File,
  weddingContext?: WeddingContext,
): Promise<string[]> {
  // Implementation would use AI service to generate contextual tags
  const tags = [];

  if (weddingContext) {
    tags.push(`${weddingContext.coupleName}`);
    if (weddingContext.weddingDate) {
      tags.push(new Date(weddingContext.weddingDate).getFullYear().toString());
    }
    if (weddingContext.venue) {
      tags.push(weddingContext.venue);
    }
  }

  // Add file-based tags
  if (file.name.toLowerCase().includes('ceremony')) tags.push('ceremony');
  if (file.name.toLowerCase().includes('reception')) tags.push('reception');
  if (file.name.toLowerCase().includes('portrait')) tags.push('portraits');

  return tags;
}

async function detectWeddingMoments(
  file: File,
  weddingContext: WeddingContext,
): Promise<string[]> {
  // AI would analyze image content to detect specific wedding moments
  return ['processional', 'vows', 'ring exchange', 'first kiss'];
}

async function attributeToVendor(
  file: File,
  weddingContext: WeddingContext,
): Promise<string | undefined> {
  // AI would try to determine which vendor created/owns this file
  return weddingContext.primaryVendor || undefined;
}
