'use client';

/**
 * Document Uploader Component
 * Extends Round 1 PDFUploader patterns for business document upload
 * WS-068: Wedding Business Compliance Hub
 */

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Calendar,
  Tag,
  Info,
  X,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  DocumentUploadRequest,
  DocumentUploadProgress,
  DocumentCategory,
  SecurityLevel,
  DocumentUploaderProps,
  DEFAULT_DOCUMENT_CATEGORIES,
  SECURITY_LEVELS,
  MAX_FILE_SIZES,
} from '@/types/documents';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'text/plain': ['.txt'],
};

export function DocumentUploader({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  disabled = false,
  maxFileSize = MAX_FILE_SIZES.default,
  allowedCategories,
  defaultCategory,
  className = '',
  multiple = false,
}: DocumentUploaderProps) {
  const [uploads, setUploads] = useState<DocumentUploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categories] = useState<DocumentCategory[]>(
    allowedCategories
      ? DEFAULT_DOCUMENT_CATEGORIES.filter((cat) =>
          allowedCategories.includes(cat.id),
        )
      : DEFAULT_DOCUMENT_CATEGORIES,
  );

  const statusIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeFromName = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'PDF Document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return 'Image';
      case 'doc':
      case 'docx':
        return 'Word Document';
      case 'txt':
        return 'Text Document';
      default:
        return 'Document';
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }

    if (file.size < 1024) {
      return 'File appears to be too small or empty';
    }

    // Check filename
    if (!file.name || file.name.trim() === '') {
      return 'File must have a valid name';
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|vbs|js|jar|app|dmg)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
      /[<>:"|?*]/,
      /^\./,
      /\.\./,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        return 'Filename contains invalid characters or patterns';
      }
    }

    return null;
  };

  const uploadFile = async (file: File, category: string): Promise<void> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create initial upload progress
    const initialProgress: DocumentUploadProgress = {
      uploadId: tempId,
      filename: file.name,
      progress: 0,
      status: 'uploading',
      fileSize: file.size,
    };

    setUploads((prev) => [...prev, initialProgress]);

    try {
      // Get user ID (you might need to adapt this based on your auth system)
      const userId = 'current-user-id'; // TODO: Get from auth context

      const request: DocumentUploadRequest = {
        file,
        category_id: category,
        title: file.name.split('.')[0], // Default title from filename
        is_compliance_required: false,
        security_level: 'standard',
        expiry_warning_days: 30,
      };

      const document = await documentStorageService.uploadDocument(
        request,
        userId,
        (progress) => {
          setUploads((prev) =>
            prev.map((upload) =>
              upload.uploadId === tempId
                ? { ...progress, uploadId: tempId }
                : upload,
            ),
          );
        },
      );

      // Update with final success state
      setUploads((prev) =>
        prev.map((upload) =>
          upload.uploadId === tempId
            ? { ...upload, status: 'completed', progress: 100 }
            : upload,
        ),
      );

      onUploadStart?.(document.id);
      onUploadComplete?.(document.id);
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const files = multiple ? acceptedFiles : [acceptedFiles[0]];

      for (const file of files) {
        if (!file) continue;

        const error = validateFile(file);
        if (error) {
          onUploadError?.(error);
          continue;
        }

        const category = defaultCategory || categories[0]?.id;
        if (!category) {
          onUploadError?.('No category specified');
          continue;
        }

        uploadFile(file, category);
      }
    },
    [multiple, maxFileSize, onUploadError, categories, defaultCategory],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: multiple ? 10 : 1,
    disabled: disabled,
    multiple: multiple,
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

  const getStatusIcon = (status: DocumentUploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = (upload: DocumentUploadProgress) => {
    switch (upload.status) {
      case 'uploading':
        return 'Uploading file...';
      case 'validating':
        return 'Validating security...';
      case 'processing':
        return 'Processing document...';
      case 'completed':
        return 'Upload completed successfully!';
      case 'failed':
        return upload.error || 'Upload failed';
      default:
        return 'Processing...';
    }
  };

  const getSecurityLevelInfo = (level: SecurityLevel) => {
    const info = SECURITY_LEVELS[level];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-help"
              style={{ borderColor: info.color, color: info.color }}
            >
              <Shield className="w-3 h-3 mr-1" />
              {info.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{info.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const iconMap: Record<string, any> = {
      Shield,
      FileText,
      Upload,
      Calendar,
      Tag,
    };
    const IconComponent = category?.icon
      ? iconMap[category.icon] || FileText
      : FileText;
    return (
      <IconComponent className="w-4 h-4" style={{ color: category?.color }} />
    );
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
                  Drop your documents here!
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Release to start uploading
                </p>
              </div>
            </>
          ) : (
            <>
              <FileText className="h-16 w-16 text-gray-400" />
              <div className="text-center">
                <h3 className="text-gray-900 font-semibold text-xl mb-2">
                  Upload Business Documents
                </h3>
                <p className="text-gray-600 mb-2">
                  Drag & drop your {multiple ? 'documents' : 'document'} here,
                  or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: {formatFileSize(maxFileSize)} • Supported:
                  PDF, Images, Word, Text files
                </p>
                {defaultCategory && (
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <span className="text-sm text-gray-500">Category:</span>
                    <div className="flex items-center space-x-1">
                      {getCategoryIcon(defaultCategory)}
                      <span className="text-sm font-medium text-gray-700">
                        {
                          categories.find((c) => c.id === defaultCategory)
                            ?.display_name
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="mt-3 px-6 py-2"
                disabled={disabled}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose {multiple ? 'Files' : 'File'}
              </Button>
            </>
          )}
        </div>

        {/* Security indicator */}
        <div className="absolute top-4 right-4">
          {getSecurityLevelInfo('standard')}
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Processing Status
          </h3>

          {uploads.map((upload) => (
            <Card
              key={upload.uploadId}
              className="border-l-4"
              style={{
                borderLeftColor:
                  upload.status === 'completed'
                    ? '#10B981'
                    : upload.status === 'failed'
                      ? '#EF4444'
                      : '#3B82F6',
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-10 h-10 text-blue-500" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate max-w-xs">
                        {upload.filename}
                      </p>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span>{formatFileSize(upload.fileSize)}</span>
                        <span>{getFileTypeFromName(upload.filename)}</span>
                        {upload.securityLevel &&
                          getSecurityLevelInfo(upload.securityLevel)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusIcon(upload.status)}
                    <Button
                      variant="ghost"
                      onClick={() => removeUpload(upload.uploadId)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      disabled={
                        upload.status === 'uploading' ||
                        upload.status === 'processing'
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Status Text */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusText(upload)}
                    </span>
                    {upload.status !== 'failed' &&
                      upload.status !== 'completed' && (
                        <span className="text-sm text-gray-500">
                          {upload.progress}%
                        </span>
                      )}
                  </div>

                  {/* Progress Bar */}
                  {upload.status !== 'failed' &&
                    upload.status !== 'completed' && (
                      <Progress value={upload.progress} className="h-2" />
                    )}

                  {/* Virus Scan Status */}
                  {upload.virusScanStatus && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4" />
                      <span
                        className={
                          upload.virusScanStatus === 'clean'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }
                      >
                        Security scan:{' '}
                        {upload.virusScanStatus === 'clean'
                          ? 'Passed'
                          : 'Checking...'}
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {upload.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{upload.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success Actions */}
                  {upload.status === 'completed' && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => onUploadComplete?.(upload.uploadId)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </Button>

                      <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        <span>Upload successful</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-3">
                Business Document Upload:
              </h4>
              <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                <li>All files are scanned for security threats and viruses</li>
                <li>
                  Documents are encrypted and stored securely in the cloud
                </li>
                <li>
                  Set expiry dates for compliance tracking and automated alerts
                </li>
                <li>
                  Organize by categories for easy management and retrieval
                </li>
                <li>Create secure sharing links for clients and vendors</li>
              </ul>

              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro Tip:</strong> Higher quality, text-based
                  documents work best for automated processing. Ensure your
                  files are under {formatFileSize(maxFileSize)}
                  for optimal performance.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported file types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">
            Supported File Types
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span>PDF Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Word Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-green-500" />
              <span>Images (JPG, PNG)</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Text Files</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
