'use client';

// WS-186: Advanced bulk upload component with progress tracking and AI processing

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  FileImage,
  Loader2,
  Sparkles,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { UploadResult } from '@/types/portfolio';

interface ImageUploaderProps {
  onUploadComplete: (results: UploadResult[]) => void;
  maxFiles: number;
  acceptedFormats: string[];
  enableAITagging: boolean;
  onClose?: () => void;
}

interface FileUploadState {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  uploadedUrl?: string;
  aiTags?: string[];
  category?: string;
  error?: string;
}

export function ImageUploader({
  onUploadComplete,
  maxFiles = 50,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  enableAITagging = true,
  onClose,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
      }
    },
    [],
  );

  // Add files to upload queue
  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles = newFiles.filter((file) => {
        // Check file type
        if (!acceptedFormats.includes(file.type)) {
          console.warn(
            `File ${file.name} has unsupported format: ${file.type}`,
          );
          return false;
        }

        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          console.warn(
            `File ${file.name} is too large: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
          );
          return false;
        }

        return true;
      });

      if (files.length + validFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed. Please select fewer files.`);
        return;
      }

      const fileStates: FileUploadState[] = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...fileStates]);
    },
    [files.length, maxFiles, acceptedFormats],
  );

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Retry failed upload
  const retryUpload = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f,
      ),
    );
  }, []);

  // Start upload process
  const startUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const results: UploadResult[] = [];

    try {
      // Process files in batches of 5 for better performance
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async (fileState) => {
          try {
            // Update status to uploading
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileState.id
                  ? { ...f, status: 'uploading', progress: 0 }
                  : f,
              ),
            );

            // Upload file with progress tracking
            const uploadResult = await uploadFile(fileState);

            if (uploadResult.success) {
              // Update status to processing for AI analysis
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileState.id
                    ? {
                        ...f,
                        status: 'processing',
                        progress: 90,
                        uploadedUrl: uploadResult.url,
                      }
                    : f,
                ),
              );

              // Run AI processing if enabled
              let aiData = {};
              if (enableAITagging && uploadResult.url) {
                aiData = await processWithAI(uploadResult.url);
              }

              // Mark as completed
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileState.id
                    ? {
                        ...f,
                        status: 'completed',
                        progress: 100,
                        aiTags: aiData.tags,
                        category: aiData.category,
                      }
                    : f,
                ),
              );

              results.push({
                success: true,
                filename: fileState.file.name,
                imageId: uploadResult.imageId,
                url: uploadResult.url,
                aiTags: aiData.tags,
                category: aiData.category,
              });
            } else {
              throw new Error(uploadResult.error || 'Upload failed');
            }
          } catch (error: any) {
            // Mark as error
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileState.id
                  ? { ...f, status: 'error', error: error.message }
                  : f,
              ),
            );

            results.push({
              success: false,
              filename: fileState.file.name,
              error: error.message,
            });
          }
        });

        await Promise.all(batchPromises);

        // Update overall progress
        const completedFiles = results.length;
        setOverallProgress((completedFiles / files.length) * 100);
      }

      // Call completion handler
      onUploadComplete(results);
    } catch (error) {
      console.error('Batch upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [files, enableAITagging, onUploadComplete]);

  // Upload single file
  const uploadFile = async (fileState: FileUploadState): Promise<any> => {
    const formData = new FormData();
    formData.append('file', fileState.file);
    formData.append('filename', fileState.file.name);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 80; // Reserve 20% for AI processing
          setFiles((prev) =>
            prev.map((f) => (f.id === fileState.id ? { ...f, progress } : f)),
          );
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              url: response.url,
              imageId: response.imageId,
            });
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.open('POST', '/api/portfolio/upload');
      xhr.send(formData);
    });
  };

  // Process with AI
  const processWithAI = async (imageUrl: string): Promise<any> => {
    try {
      const response = await fetch('/api/portfolio/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) throw new Error('AI processing failed');

      return await response.json();
    } catch (error) {
      console.warn('AI processing failed:', error);
      return { tags: [], category: 'uncategorized' };
    }
  };

  // Get status summary
  const getStatusSummary = () => {
    const pending = files.filter((f) => f.status === 'pending').length;
    const uploading = files.filter((f) => f.status === 'uploading').length;
    const processing = files.filter((f) => f.status === 'processing').length;
    const completed = files.filter((f) => f.status === 'completed').length;
    const failed = files.filter((f) => f.status === 'error').length;

    return { pending, uploading, processing, completed, failed };
  };

  const statusSummary = getStatusSummary();
  const canStartUpload =
    files.length > 0 && !isUploading && statusSummary.pending > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Bulk Image Upload
            </h2>
            <p className="text-gray-600">
              Upload up to {maxFiles} images with automatic AI processing
            </p>
          </div>

          <div className="flex items-center gap-2">
            {enableAITagging && (
              <Badge
                variant="secondary"
                className="bg-purple-50 text-purple-700"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
            )}

            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-6">
          {files.length === 0 ? (
            <div
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-colors
                ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Drop your images here
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Or click to browse and select files
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  Select Images
                </Button>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Supported formats: JPEG, PNG, WebP, HEIF</p>
                  <p>Maximum file size: 50MB per image</p>
                  <p>Maximum files: {maxFiles} images</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedFormats.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">
                    Upload Progress (
                    {statusSummary.completed + statusSummary.failed}/
                    {files.length})
                  </h3>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <FileImage className="w-4 h-4 mr-1" />
                      Add More
                    </Button>

                    {canStartUpload && (
                      <Button variant="primary" onClick={startUpload}>
                        <Upload className="w-4 h-4 mr-2" />
                        Start Upload
                      </Button>
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={overallProgress} className="h-2" />
                    <p className="text-sm text-gray-600">
                      {Math.round(overallProgress)}% complete
                    </p>
                  </div>
                )}

                <div className="flex gap-4 text-sm">
                  <span className="text-yellow-600">
                    Pending: {statusSummary.pending}
                  </span>
                  <span className="text-blue-600">
                    Uploading: {statusSummary.uploading}
                  </span>
                  <span className="text-purple-600">
                    Processing: {statusSummary.processing}
                  </span>
                  <span className="text-green-600">
                    Completed: {statusSummary.completed}
                  </span>
                  {statusSummary.failed > 0 && (
                    <span className="text-red-600">
                      Failed: {statusSummary.failed}
                    </span>
                  )}
                </div>
              </div>

              {/* File List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {files.map((fileState) => (
                  <FileUploadCard
                    key={fileState.id}
                    fileState={fileState}
                    onRemove={() => removeFile(fileState.id)}
                    onRetry={() => retryUpload(fileState.id)}
                    enableAITagging={enableAITagging}
                  />
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedFormats.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                {statusSummary.completed > 0 &&
                  ` • ${statusSummary.completed} uploaded successfully`}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setFiles([])}
                  disabled={isUploading}
                >
                  Clear All
                </Button>

                {statusSummary.completed > 0 && (
                  <Button variant="primary" onClick={() => onClose?.()}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual file upload card component
interface FileUploadCardProps {
  fileState: FileUploadState;
  onRemove: () => void;
  onRetry: () => void;
  enableAITagging: boolean;
}

function FileUploadCard({
  fileState,
  onRemove,
  onRetry,
  enableAITagging,
}: FileUploadCardProps) {
  const getStatusIcon = () => {
    switch (fileState.status) {
      case 'pending':
        return <ImageIcon className="w-5 h-5 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'processing':
        return <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (fileState.status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return `Uploading... ${Math.round(fileState.progress)}%`;
      case 'processing':
        return 'AI Processing...';
      case 'completed':
        return 'Complete';
      case 'error':
        return fileState.error || 'Failed';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      {/* Status Icon */}
      <div className="flex-shrink-0">{getStatusIcon()}</div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900 truncate">
            {fileState.file.name}
          </p>

          <div className="flex items-center gap-2">
            {fileState.status === 'completed' &&
              enableAITagging &&
              fileState.aiTags && (
                <div className="flex gap-1">
                  {fileState.aiTags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {fileState.aiTags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{fileState.aiTags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600">
            {getStatusText()} • {(fileState.file.size / 1024 / 1024).toFixed(1)}{' '}
            MB
            {fileState.category && ` • ${fileState.category}`}
          </p>
        </div>

        {/* Progress Bar */}
        {(fileState.status === 'uploading' ||
          fileState.status === 'processing') && (
          <div className="mt-2">
            <Progress value={fileState.progress} className="h-1" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {fileState.status === 'error' && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        {fileState.status !== 'uploading' &&
          fileState.status !== 'processing' && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
      </div>
    </div>
  );
}
