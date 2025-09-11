'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'validating' | 'processing' | 'completed' | 'failed';
  error?: string;
  fileSize: number;
  qualityScore?: number;
  fieldsDetected?: number;
}

interface PDFUploaderProps {
  onUploadComplete?: (uploadId: string) => void;
  onUploadStart?: (uploadId: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  maxFileSize?: number;
  className?: string;
}

export function PDFUploader({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  disabled = false,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  className = '',
}: PDFUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const statusIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }
    if (file.size < 1024) {
      return 'File appears to be too small or empty';
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<void> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create initial upload progress
    const initialProgress: UploadProgress = {
      uploadId: tempId,
      filename: file.name,
      progress: 0,
      status: 'uploading',
      fileSize: file.size,
    };

    setUploads((prev) => [...prev, initialProgress]);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload with progress tracking
      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      const { uploadId } = result;

      // Update with real upload ID
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === tempId
            ? { ...upload, uploadId, progress: 100, status: 'validating' }
            : upload,
        ),
      );

      onUploadStart?.(uploadId);

      // Start validation
      await validateUpload(uploadId);
    } catch (error) {
      console.error('Upload error:', error);
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === tempId
            ? { ...upload, status: 'failed', error: error.message }
            : upload,
        ),
      );
      onUploadError?.(error.message);
    }
  };

  const validateUpload = async (uploadId: string): Promise<void> => {
    try {
      const response = await fetch('/api/pdf/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      const result = await response.json();
      const { validation } = result;

      if (!validation.isValid) {
        setUploads((prev) =>
          prev.map((upload) =>
            upload.uploadId === uploadId
              ? {
                  ...upload,
                  status: 'failed',
                  error: validation.issues.join(', '),
                }
              : upload,
          ),
        );
        return;
      }

      // Start processing
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === uploadId
            ? { ...upload, status: 'processing', progress: 0 }
            : upload,
        ),
      );

      await startProcessing(uploadId);
    } catch (error) {
      console.error('Validation error:', error);
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === uploadId
            ? { ...upload, status: 'failed', error: error.message }
            : upload,
        ),
      );
    }
  };

  const startProcessing = async (uploadId: string): Promise<void> => {
    try {
      // Start processing
      const response = await fetch('/api/pdf/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      // Start polling for status
      pollProcessingStatus(uploadId);
    } catch (error) {
      console.error('Processing error:', error);
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === uploadId
            ? { ...upload, status: 'failed', error: error.message }
            : upload,
        ),
      );
    }
  };

  const pollProcessingStatus = (uploadId: string): void => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/pdf/process?uploadId=${uploadId}`);

        if (!response.ok) {
          throw new Error('Status check failed');
        }

        const result = await response.json();
        const { processing, upload } = result;

        if (processing.status?.status === 'completed') {
          setUploads((prev) =>
            prev.map((u) =>
              u.uploadId === uploadId
                ? {
                    ...u,
                    status: 'completed',
                    progress: 100,
                    qualityScore: processing.result?.metadata?.qualityScore,
                    fieldsDetected:
                      processing.result?.fieldResult?.detectedFields?.length,
                  }
                : u,
            ),
          );

          // Clear interval
          const interval = statusIntervals.current.get(uploadId);
          if (interval) {
            clearInterval(interval);
            statusIntervals.current.delete(uploadId);
          }

          onUploadComplete?.(uploadId);
          return;
        }

        if (processing.status?.status === 'failed') {
          setUploads((prev) =>
            prev.map((u) =>
              u.uploadId === uploadId
                ? {
                    ...u,
                    status: 'failed',
                    error: processing.status.error || 'Processing failed',
                  }
                : u,
            ),
          );

          // Clear interval
          const interval = statusIntervals.current.get(uploadId);
          if (interval) {
            clearInterval(interval);
            statusIntervals.current.delete(uploadId);
          }
          return;
        }

        if (
          upload.status === 'processing' ||
          processing.status?.status === 'processing'
        ) {
          const progress =
            processing.status?.progress ||
            (upload.status === 'processing' ? 50 : 25);

          setUploads((prev) =>
            prev.map((u) =>
              u.uploadId === uploadId
                ? { ...u, progress, status: 'processing' }
                : u,
            ),
          );
        }
      } catch (error) {
        console.error('Status polling error:', error);
        setUploads((prev) =>
          prev.map((u) =>
            u.uploadId === uploadId
              ? { ...u, status: 'failed', error: error.message }
              : u,
          ),
        );

        // Clear interval on error
        const interval = statusIntervals.current.get(uploadId);
        if (interval) {
          clearInterval(interval);
          statusIntervals.current.delete(uploadId);
        }
      }
    };

    // Start polling every 5 seconds
    const interval = setInterval(poll, 5000);
    statusIntervals.current.set(uploadId, interval);

    // Initial poll
    poll();

    // Stop polling after 10 minutes max
    setTimeout(
      () => {
        const intervalToStop = statusIntervals.current.get(uploadId);
        if (intervalToStop) {
          clearInterval(intervalToStop);
          statusIntervals.current.delete(uploadId);
        }
      },
      10 * 60 * 1000,
    );
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }

      uploadFile(file);
    },
    [maxFileSize, onUploadError],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: disabled,
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const removeUpload = (uploadId: string) => {
    // Clear any running intervals
    const interval = statusIntervals.current.get(uploadId);
    if (interval) {
      clearInterval(interval);
      statusIntervals.current.delete(uploadId);
    }

    setUploads((prev) => prev.filter((upload) => upload.uploadId !== uploadId));
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'uploading':
        return 'Uploading file...';
      case 'validating':
        return 'Validating PDF...';
      case 'processing':
        return 'Extracting fields with AI...';
      case 'completed':
        return `Ready! Found ${upload.fieldsDetected || 0} fields`;
      case 'failed':
        return upload.error || 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          min-h-[220px] flex flex-col items-center justify-center
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isDragActive ? (
            <>
              <Upload className="h-16 w-16 text-blue-500 animate-bounce" />
              <div className="text-center">
                <p className="text-blue-700 font-semibold text-xl">
                  Drop your PDF here!
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Release to start processing
                </p>
              </div>
            </>
          ) : (
            <>
              <FileText className="h-16 w-16 text-gray-400" />
              <div className="text-center">
                <h3 className="text-gray-900 font-semibold text-xl mb-2">
                  Upload Wedding PDF
                </h3>
                <p className="text-gray-600 mb-2">
                  Drag & drop your contract or form here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: {formatFileSize(maxFileSize)} • PDF files
                  only
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-3 px-6 py-2"
                disabled={disabled}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose PDF File
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Processing Status
          </h3>

          {uploads.map((upload) => (
            <div
              key={upload.uploadId}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-10 h-10 text-blue-500" />
                  <div>
                    <p className="font-semibold text-gray-900 truncate max-w-xs">
                      {upload.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(upload.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.status)}
                  <Button
                    variant="ghost"
                    onClick={() => removeUpload(upload.uploadId)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Status Text */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {getStatusText(upload)}
                  </span>
                  {upload.status !== 'failed' && (
                    <span className="text-sm text-gray-500">
                      {upload.progress}%
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {upload.status !== 'failed' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        upload.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {upload.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {upload.error}
                    </p>
                  </div>
                )}

                {/* Success Actions */}
                {upload.status === 'completed' && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => onUploadComplete?.(upload.uploadId)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review & Map Fields
                    </Button>

                    {upload.qualityScore && (
                      <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">
                          Quality: {upload.qualityScore}%
                        </span>
                        <span className="ml-3">
                          {upload.fieldsDetected || 0} fields detected
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-3">
              How PDF Import Works:
            </h4>
            <ol className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                Upload your wedding contract, questionnaire, or form
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                Our AI analyzes the PDF and detects form fields automatically
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                Review detected fields and map them to your requirements
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                Generate a beautiful digital form for your clients
              </li>
            </ol>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Pro Tip:</strong> Higher quality, text-based PDFs
                work best. Scanned documents will still work but may require
                more manual review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
