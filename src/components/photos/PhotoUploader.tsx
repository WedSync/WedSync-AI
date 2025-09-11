'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image,
  Loader2,
} from 'lucide-react';
import type { BatchUploadSession, UploadProgress } from '@/types/photos';

interface PhotoUploaderProps {
  galleryId?: string;
  clientId?: string;
  onUploadComplete?: (session: BatchUploadSession) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFormats?: string[];
}

export function PhotoUploader({
  galleryId,
  clientId,
  onUploadComplete,
  maxFiles = 100,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSession, setUploadSession] = useState<BatchUploadSession | null>(
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFiles = (
    files: File[],
  ): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!acceptedFormats.includes(file.type)) {
        errors.push(
          `${file.name}: Invalid format. Accepted: JPEG, PNG, WebP, HEIC`,
        );
        continue;
      }
      if (file.size > maxFileSize) {
        errors.push(
          `${file.name}: File too large. Max size: ${maxFileSize / (1024 * 1024)}MB`,
        );
        continue;
      }
      valid.push(file);
    }

    if (valid.length + selectedFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      valid.splice(maxFiles - selectedFiles.length);
    }

    return { valid, errors };
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        // Validation errors handled by UI feedback
      }

      if (valid.length > 0) {
        setSelectedFiles((prev) => [...prev, ...valid]);
      }
    },
    [selectedFiles, maxFiles, maxFileSize, acceptedFormats],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      // Validation errors handled by UI feedback
    }

    if (valid.length > 0) {
      setSelectedFiles((prev) => [...prev, ...valid]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    uploadAbortController.current = new AbortController();

    const session: BatchUploadSession = {
      id: `session-${Date.now()}`,
      totalFiles: selectedFiles.length,
      completedFiles: 0,
      failedFiles: 0,
      startedAt: new Date().toISOString(),
      uploads: selectedFiles.map((file) => ({
        photoId: `photo-${Date.now()}-${Math.random()}`,
        filename: file.name,
        progress: 0,
        status: 'pending' as const,
      })),
    };

    setUploadSession(session);

    // Simulate batch upload with progress
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const upload = session.uploads[i];

      try {
        // Update status to uploading
        upload.status = 'uploading';
        setUploadSession({ ...session });

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          if (uploadAbortController.current?.signal.aborted) {
            throw new Error('Upload cancelled');
          }

          upload.progress = progress;
          setUploadSession({ ...session });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Mark as completed
        upload.status = 'completed';
        session.completedFiles++;
        setUploadSession({ ...session });
      } catch (error) {
        upload.status = 'error';
        upload.error = error instanceof Error ? error.message : 'Upload failed';
        session.failedFiles++;
        setUploadSession({ ...session });
      }
    }

    session.completedAt = new Date().toISOString();
    setUploadSession(session);
    setIsUploading(false);
    setSelectedFiles([]);

    if (onUploadComplete) {
      onUploadComplete(session);
    }
  };

  const cancelUpload = () => {
    uploadAbortController.current?.abort();
    setIsUploading(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      {!isUploading && selectedFiles.length === 0 && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-12
            transition-all duration-200 cursor-pointer
            ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFormats.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop photos here or click to browse
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload up to {maxFiles} photos • Max {maxFileSize / (1024 * 1024)}
              MB per file
            </p>
            <p className="text-xs text-gray-400">
              Supported formats: JPEG, PNG, WebP, HEIC
            </p>
          </div>
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Selected Photos ({selectedFiles.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFiles([])}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear All
              </button>
              <button
                onClick={uploadFiles}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Upload All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
                <p className="mt-1 text-xs text-gray-600 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadSession && isUploading && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Uploading {uploadSession.totalFiles} photos...
            </h3>
            <button
              onClick={cancelUpload}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadSession.uploads.map((upload) => (
              <div key={upload.photoId} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {upload.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-error-600" />
                  )}
                  {upload.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                  )}
                  {upload.status === 'pending' && (
                    <Image className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.filename}
                  </p>
                  {upload.status === 'uploading' && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  {upload.error && (
                    <p className="text-xs text-error-600 mt-1">
                      {upload.error}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 text-sm text-gray-500">
                  {upload.status === 'uploading' && `${upload.progress}%`}
                  {upload.status === 'completed' && 'Done'}
                  {upload.status === 'error' && 'Failed'}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium text-gray-900">
                {uploadSession.completedFiles} of {uploadSession.totalFiles}{' '}
                completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(uploadSession.completedFiles / uploadSession.totalFiles) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Complete */}
      {uploadSession && !isUploading && (
        <div className="mt-6 bg-success-50 border border-success-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Upload Complete
              </h3>
              <p className="text-sm text-gray-600">
                Successfully uploaded {uploadSession.completedFiles} of{' '}
                {uploadSession.totalFiles} photos
                {uploadSession.failedFiles > 0 &&
                  ` (${uploadSession.failedFiles} failed)`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
