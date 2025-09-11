'use client';

/**
 * PhotoUpload Component - WS-079 Photo Gallery System
 * Drag-and-drop photo upload with batch processing using Untitled UI patterns
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { photoService } from '@/lib/services/photoService';
import { UploadProgress, BatchUploadSession } from '@/types/photos';

interface PhotoUploadProps {
  bucketId?: string;
  albumId?: string;
  onClose: () => void;
  onComplete: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];

export function PhotoUpload({
  bucketId,
  albumId,
  onClose,
  onComplete,
  className = '',
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadSession, setUploadSession] = useState<BatchUploadSession | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [],
  );

  // Process selected files
  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach((file) => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 50MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError(null);
  }, []);

  // Remove file from upload queue
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Start upload process
  const handleUpload = useCallback(async () => {
    if (!bucketId || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      await photoService.uploadBatch(files, bucketId, albumId, (session) => {
        setUploadSession(session);
      });

      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  }, [files, bucketId, albumId, onComplete]);

  // Calculate overall progress
  const overallProgress = uploadSession
    ? Math.round(
        (uploadSession.completedFiles / uploadSession.totalFiles) * 100,
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-display-xs font-bold text-gray-900">
            Upload Photos
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Area */}
          {!uploadSession && (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />

              <div className="flex flex-col items-center space-y-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Upload className="w-6 h-6 text-gray-600" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Drop photos here to upload
                  </h3>
                  <p className="text-gray-500 mb-4">
                    or click to select files from your device
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Photos
                  </button>
                </div>

                <p className="text-xs text-gray-400">
                  Supports JPEG, PNG, HEIC, WebP up to 50MB each
                </p>
              </div>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && !uploadSession && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                Selected Files ({files.length})
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg">
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadSession && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Uploading {uploadSession.totalFiles} photos
                </h3>
                <span className="text-sm text-gray-500">
                  {uploadSession.completedFiles} / {uploadSession.totalFiles}
                </span>
              </div>

              {/* Overall Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              {/* Individual File Progress */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadSession.uploads.map((upload, index) => (
                  <div
                    key={upload.photoId}
                    className="flex items-center space-x-3 p-2"
                  >
                    <div className="flex-shrink-0">
                      {upload.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-success-600" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-error-600" />
                      )}
                      {upload.status === 'uploading' && (
                        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      {upload.status === 'pending' && (
                        <div className="w-5 h-5 bg-gray-200 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {upload.filename}
                      </p>
                      {upload.error && (
                        <p className="text-xs text-error-600">{upload.error}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {upload.progress}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!uploadSession && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                disabled={isUploading}
              >
                Cancel
              </button>

              <button
                onClick={handleUpload}
                disabled={files.length === 0 || !bucketId || isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading
                  ? 'Uploading...'
                  : `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Upload Complete Footer */}
        {uploadSession?.completedAt && (
          <div className="px-6 py-4 bg-success-50 border-t border-success-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-success-600" />
                <span className="text-sm font-medium text-success-800">
                  Upload Complete!
                </span>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-success-700 bg-success-100 border border-success-200 rounded-lg hover:bg-success-200 focus:outline-none focus:ring-4 focus:ring-success-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
