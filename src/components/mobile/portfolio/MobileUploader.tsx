'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  category?: string;
  tags?: string[];
  metadata?: {
    capturedAt: Date;
    location?: { lat: number; lng: number; venue?: string };
    equipment?: string;
  };
}

export interface CompressionOptions {
  quality: number; // 0.1 - 1.0
  maxWidth: number;
  maxHeight: number;
  format: 'jpeg' | 'webp' | 'png';
}

export interface MobileUploaderProps {
  onUploadComplete: (files: UploadFile[]) => void;
  onClose: () => void;
  maxFiles?: number;
  acceptedFormats?: string[];
  compressionOptions?: CompressionOptions;
  backgroundUpload?: boolean;
  isOnline?: boolean;
  className?: string;
}

export const MobileUploader: React.FC<MobileUploaderProps> = ({
  onUploadComplete,
  onClose,
  maxFiles = 50,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  compressionOptions = {
    quality: 0.8,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'jpeg',
  },
  backgroundUpload = true,
  isOnline = true,
  className,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [compressionSettings, setCompressionSettings] =
    useState(compressionOptions);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file selection from input
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: UploadFile[] = [];

      for (
        let i = 0;
        i < Math.min(selectedFiles.length, maxFiles - files.length);
        i++
      ) {
        const file = selectedFiles[i];

        if (!acceptedFormats.includes(file.type)) {
          console.warn(
            `File ${file.name} has unsupported format: ${file.type}`,
          );
          continue;
        }

        const uploadFile: UploadFile = {
          id: `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: 'pending',
          metadata: {
            capturedAt: new Date(file.lastModified || Date.now()),
          },
        };

        newFiles.push(uploadFile);
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, acceptedFormats],
  );

  // Handle camera capture
  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const droppedFiles = e.dataTransfer.files;
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect],
  );

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Update file metadata
  const updateFileMetadata = useCallback(
    (fileId: string, metadata: Partial<UploadFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...metadata } : f)),
      );
    },
    [],
  );

  // Compress image file
  const compressImage = useCallback(
    async (file: File, options: CompressionOptions): Promise<File> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;
          const ratio = Math.min(
            options.maxWidth / width,
            options.maxHeight / height,
          );

          if (ratio < 1) {
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: `image/${options.format}`,
                  lastModified: file.lastModified,
                });
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            `image/${options.format}`,
            options.quality,
          );
        };

        img.src = URL.createObjectURL(file);
      });
    },
    [],
  );

  // Start upload process
  const startUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadPromises = files.map(async (uploadFile, index) => {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading' } : f,
          ),
        );

        // Compress image if needed
        let fileToUpload = uploadFile.file;
        if (uploadFile.file.type.startsWith('image/')) {
          fileToUpload = await compressImage(
            uploadFile.file,
            compressionSettings,
          );
        }

        // Simulate upload progress (replace with actual upload logic)
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 100));

          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f)),
          );

          // Update overall progress
          const overallProgress = (index * 100 + progress) / files.length;
          setUploadProgress(overallProgress);
        }

        // Mark as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'completed', progress: 100 }
              : f,
          ),
        );

        return { ...uploadFile, status: 'completed' as const };
      } catch (error) {
        console.error('Upload failed:', error);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'error' } : f,
          ),
        );

        return { ...uploadFile, status: 'error' as const };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      setIsUploading(false);
      onUploadComplete(results);
    } catch (error) {
      console.error('Upload batch failed:', error);
      setIsUploading(false);
    }
  }, [files, compressionSettings, compressImage, onUploadComplete]);

  // Auto-upload when files are added (if background upload is enabled)
  useEffect(() => {
    if (backgroundUpload && files.length > 0 && !isUploading && isOnline) {
      const pendingFiles = files.filter((f) => f.status === 'pending');
      if (pendingFiles.length > 0) {
        startUpload();
      }
    }
  }, [files, backgroundUpload, isUploading, isOnline, startUpload]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end',
        className,
      )}
    >
      <div className="w-full bg-white rounded-t-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload Images
            </h2>
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Compression Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quality: {Math.round(compressionSettings.quality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={compressionSettings.quality}
                  onChange={(e) =>
                    setCompressionSettings((prev) => ({
                      ...prev,
                      quality: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Width
                  </label>
                  <input
                    type="number"
                    value={compressionSettings.maxWidth}
                    onChange={(e) =>
                      setCompressionSettings((prev) => ({
                        ...prev,
                        maxWidth: parseInt(e.target.value) || 2048,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Height
                  </label>
                  <input
                    type="number"
                    value={compressionSettings.maxHeight}
                    onChange={(e) =>
                      setCompressionSettings((prev) => ({
                        ...prev,
                        maxHeight: parseInt(e.target.value) || 2048,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload area */}
        <div className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-300 hover:border-gray-400',
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <div className="text-gray-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Portfolio Images
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop images here, or use the buttons below
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleCameraCapture}
                    className="flex items-center space-x-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Camera</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Gallery</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Supports JPEG, PNG, WebP • Max {maxFiles} files •
                  {!isOnline && ' Offline uploads will sync when online'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload progress */}
              {isUploading && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      Uploading{' '}
                      {files.filter((f) => f.status === 'uploading').length} of{' '}
                      {files.length} files
                    </span>
                    <span className="text-sm text-blue-700">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* File list */}
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={file.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>

                      {/* Progress bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-pink-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {file.status === 'completed' && (
                        <div className="text-green-600">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="text-red-600">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                      {file.status === 'pending' && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {files.length} file{files.length !== 1 ? 's' : ''} ready
                {!isOnline && ' • Will upload when online'}
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setFiles([])}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isUploading}
                >
                  Clear All
                </button>

                {!backgroundUpload && (
                  <button
                    onClick={startUpload}
                    disabled={isUploading || !isOnline}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default MobileUploader;
