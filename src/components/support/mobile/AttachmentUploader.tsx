'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Video,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AttachmentUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

interface FilePreview {
  file: File;
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 10, // 10MB default
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const getFileIcon = (type: 'image' | 'video' | 'document') => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return `File size ${formatFileSize(file.size)} exceeds limit of ${maxFileSize}MB`;
    }

    return null;
  };

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: FilePreview[] = [];
      const errors: string[] = [];

      // Check total file count
      if (files.length + fileList.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setIsUploading(true);

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // Validate file
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
          continue;
        }

        // Create preview
        const id = `${file.name}-${Date.now()}-${i}`;
        const fileType = getFileType(file);

        let url = '';
        if (fileType === 'image' || fileType === 'video') {
          url = URL.createObjectURL(file);
        }

        newFiles.push({
          file,
          id,
          url,
          type: fileType,
        });
      }

      setIsUploading(false);

      if (errors.length > 0) {
        errors.forEach((error) => toast.error(error));
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesSelected(updatedFiles.map((f) => f.file));
        toast.success(`${newFiles.length} file(s) added`);
      }
    },
    [files, maxFiles, maxFileSize, allowedTypes, onFilesSelected],
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const fileToRemove = prev.find((f) => f.id === id);
        if (fileToRemove && fileToRemove.url) {
          URL.revokeObjectURL(fileToRemove.url);
        }

        const updated = prev.filter((f) => f.id !== id);
        onFilesSelected(updated.map((f) => f.file));
        return updated;
      });

      toast.success('File removed');
    },
    [onFilesSelected],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        processFiles(fileList);
      }
      // Reset input value so same file can be selected again
      e.target.value = '';
    },
    [processFiles],
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        processFiles(fileList);
      }
      // Reset input value
      e.target.value = '';
    },
    [processFiles],
  );

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles],
  );

  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">
                Attachments
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {files.length}/{maxFiles}
            </Badge>
          </div>

          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }
              ${files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-2">
                <div className="animate-spin mx-auto h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                <p className="text-sm text-gray-600">Processing files...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-gray-600">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    Drop files here or choose files
                  </p>
                  <p className="text-xs text-gray-600">
                    Max {maxFiles} files, {maxFileSize}MB each
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= maxFiles}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Choose Files
                  </Button>

                  {/* Camera capture for mobile */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={files.length >= maxFiles}
                    className="sm:hidden"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Take Photo
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />

          {/* File Previews */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-800">
                Selected Files ({files.length})
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((filePreview) => (
                  <div
                    key={filePreview.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                  >
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {filePreview.type === 'image' ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={filePreview.url}
                            alt={filePreview.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          {getFileIcon(filePreview.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {filePreview.file.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(filePreview.file.size)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {filePreview.type}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(filePreview.id)}
                      className="text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-600 space-y-1">
            <p>Supported formats: Images, Videos, PDFs, Documents</p>
            <p>
              Tip: Photos of error screens or venue issues help us assist you
              faster
            </p>
          </div>

          {/* Warnings */}
          {files.length >= maxFiles && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">
                Maximum file limit reached. Remove files to add new ones.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
