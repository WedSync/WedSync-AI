'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { cn } from '@/lib/utils';

interface LogoUploaderProps {
  onUpload: (file: File, dataUrl: string) => Promise<void>;
  onRemove: () => void;
  currentLogoUrl?: string;
  maxSize?: number; // in bytes, default 2MB
  allowedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

interface UploadError {
  type: 'size' | 'type' | 'format' | 'security' | 'network';
  message: string;
}

export default function LogoUploader({
  onUpload,
  onRemove,
  currentLogoUrl,
  maxSize = 2 * 1024 * 1024, // 2MB
  allowedTypes = ['image/jpeg', 'image/png'],
  className,
  disabled = false,
}: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentLogoUrl || null,
  );
  const [error, setError] = useState<UploadError | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security validation functions
  const validateFileSize = (file: File): boolean => {
    return file.size <= maxSize;
  };

  const validateFileType = (file: File): boolean => {
    return allowedTypes.includes(file.type);
  };

  const validateMagicBytes = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer.slice(0, 12));

        // Check magic bytes for common image formats
        const signatures = {
          jpeg: [0xff, 0xd8, 0xff],
          png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        };

        // JPEG signature check
        if (file.type === 'image/jpeg') {
          const match = signatures.jpeg.every(
            (byte, index) => bytes[index] === byte,
          );
          resolve(match);
          return;
        }

        // PNG signature check
        if (file.type === 'image/png') {
          const match = signatures.png.every(
            (byte, index) => bytes[index] === byte,
          );
          resolve(match);
          return;
        }

        resolve(false);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  };

  const sanitizeFilename = (filename: string): string => {
    // Remove path traversal attempts and dangerous characters
    return filename
      .replace(/[\/\\]/g, '') // Remove path separators
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[<>:"|?*]/g, '') // Remove Windows forbidden characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
      .trim()
      .substring(0, 255); // Limit length
  };

  const handleFileValidation = async (
    file: File,
  ): Promise<UploadError | null> => {
    // File size validation
    if (!validateFileSize(file)) {
      return {
        type: 'size',
        message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
      };
    }

    // File type validation
    if (!validateFileType(file)) {
      return {
        type: 'type',
        message: 'Only JPEG and PNG image files are allowed',
      };
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);
    if (sanitizedName !== file.name) {
      console.warn('Filename was sanitized for security:', {
        original: file.name,
        sanitized: sanitizedName,
      });
    }

    // Magic bytes validation
    const isValidFormat = await validateMagicBytes(file);
    if (!isValidFormat) {
      return {
        type: 'format',
        message: 'Invalid image file format detected',
      };
    }

    // Additional security checks
    if (file.name.includes('<script') || file.name.includes('javascript:')) {
      return {
        type: 'security',
        message: 'Potentially malicious filename detected',
      };
    }

    return null;
  };

  const processFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file
      const validationError = await handleFileValidation(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);
        setUploadProgress(50);

        try {
          // Call parent upload handler
          await onUpload(file, dataUrl);
          setUploadProgress(100);

          // Clear any previous errors
          setError(null);
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          setError({
            type: 'network',
            message: 'Failed to upload image. Please try again.',
          });
          setPreviewUrl(currentLogoUrl || null);
        }
      };

      reader.onerror = () => {
        setError({
          type: 'format',
          message: 'Failed to read image file',
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing failed:', error);
      setError({
        type: 'security',
        message: 'File processing failed. Please try a different image.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && !disabled) {
        processFile(file);
      }
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setDragActive(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled],
  );

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getProgressBarColor = () => {
    if (error) return 'bg-error-500';
    if (uploadProgress === 100) return 'bg-success-500';
    return 'bg-primary-500';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all duration-200',
          dragActive && !disabled
            ? 'border-primary-300 bg-primary-50'
            : 'border-gray-300',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-gray-400',
          error ? 'border-error-300 bg-error-50' : '',
          'focus-within:ring-4 focus-within:ring-primary-100',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          aria-describedby="logo-upload-description logo-upload-error"
        />

        <div className="p-6">
          {previewUrl ? (
            /* Preview State */
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="h-16 w-16 object-contain rounded-lg border border-gray-200"
                    onError={() => setPreviewUrl(null)}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Logo uploaded successfully
                  </p>
                  <p className="text-xs text-gray-500">
                    Click to change or drag a new image
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled || isUploading}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove logo</span>
              </Button>
            </div>
          ) : (
            /* Upload State */
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {isUploading ? (
                  <Loader2 className="h-12 w-12 text-primary-500 animate-spin" />
                ) : error ? (
                  <AlertTriangle className="h-12 w-12 text-error-500" />
                ) : (
                  <div className="relative">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <Image className="h-6 w-6 text-gray-400 absolute -bottom-1 -right-1" />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isUploading ? 'Uploading logo...' : 'Upload your logo'}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Drop an image here or click to browse
              </p>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Supported formats: JPEG, PNG</p>
                <p>Maximum size: {Math.round(maxSize / (1024 * 1024))}MB</p>
                <p>Recommended: Square images work best</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-2 bg-gray-200 rounded-b-lg overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  getProgressBarColor(),
                )}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="flex items-start space-x-3 p-4 bg-error-50 border border-error-200 rounded-lg"
          role="alert"
          aria-live="polite"
          id="logo-upload-error"
        >
          <AlertTriangle className="h-5 w-5 text-error-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-error-800">Upload Error</p>
            <p className="text-sm text-error-700 mt-1">{error.message}</p>
            {error.type === 'security' && (
              <p className="text-xs text-error-600 mt-2">
                For security reasons, only standard image files are accepted.
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-error-600 hover:text-error-700"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss error</span>
          </Button>
        </div>
      )}

      {/* Success Message */}
      {previewUrl && !isUploading && !error && (
        <div className="flex items-center space-x-3 p-4 bg-success-50 border border-success-200 rounded-lg">
          <Check className="h-5 w-5 text-success-500 flex-shrink-0" />
          <p className="text-sm text-success-800">
            Logo uploaded successfully! Your branding will update across all
            client communications.
          </p>
        </div>
      )}

      {/* Accessibility Description */}
      <p className="sr-only" id="logo-upload-description">
        Upload a logo image file to represent your wedding business. Supported
        formats include JPEG and PNG files up to{' '}
        {Math.round(maxSize / (1024 * 1024))} megabytes. The logo will appear on
        client forms, emails, and other communications.
      </p>
    </div>
  );
}
