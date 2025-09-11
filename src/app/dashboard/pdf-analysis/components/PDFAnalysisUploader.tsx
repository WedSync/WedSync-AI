'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface UploadError {
  message: string;
  code: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'UPLOAD_FAILED';
}

interface PDFFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: UploadError;
  analysisId?: string;
}

interface PDFAnalysisUploaderProps {
  onUploadSuccess: (analysisId: string, file: File) => void;
  onUploadError: (error: UploadError) => void;
  maxFileSize?: number; // in bytes
  disabled?: boolean;
}

export function PDFAnalysisUploader({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
}: PDFAnalysisUploaderProps) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): UploadError | null => {
    if (file.type !== 'application/pdf') {
      return {
        message: 'Only PDF files are supported for wedding form analysis',
        code: 'INVALID_FILE_TYPE',
      };
    }

    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      return {
        message: `File size must be under ${maxSizeMB}MB to ensure quick analysis`,
        code: 'FILE_TOO_LARGE',
      };
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/pdf-analysis/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    return data.analysisId;
  };

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: PDFFile[] = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      // Validate files first
      const validatedFiles = newFiles.map((fileData) => {
        const error = validateFile(fileData.file);
        if (error) {
          return { ...fileData, status: 'error' as const, error };
        }
        return fileData;
      });

      setFiles((prev) => [...prev, ...validatedFiles]);

      // Upload valid files
      for (const fileData of validatedFiles) {
        if (fileData.error) {
          onUploadError(fileData.error);
          continue;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id
              ? { ...f, status: 'uploading', progress: 0 }
              : f,
          ),
        );

        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileData.id && f.progress < 90
                  ? { ...f, progress: f.progress + 10 }
                  : f,
              ),
            );
          }, 200);

          const analysisId = await uploadFile(fileData.file);

          clearInterval(progressInterval);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? { ...f, status: 'success', progress: 100, analysisId }
                : f,
            ),
          );

          onUploadSuccess(analysisId, fileData.file);
        } catch (error) {
          const uploadError: UploadError = {
            message: 'Failed to upload your wedding form. Please try again.',
            code: 'UPLOAD_FAILED',
          };

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? { ...f, status: 'error', error: uploadError }
                : f,
            ),
          );

          onUploadError(uploadError);
        }
      }
    },
    [onUploadSuccess, onUploadError, maxFileSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
    },
    [processFiles],
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragOver && !disabled && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          'hover:border-primary/50 hover:bg-gray-50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={disabled ? undefined : openFileDialog}
      >
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
            <Upload className="h-full w-full" />
          </div>

          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Upload Wedding Forms for AI Analysis
          </h3>

          <p className="mb-4 text-sm text-gray-600">
            Drop your PDF wedding forms here, or click to browse. Our AI will
            extract client details, preferences, and create custom forms.
          </p>

          <div className="space-y-2 text-xs text-gray-500">
            <p>• PDF files only, max 10MB each</p>
            <p>
              • Client questionnaires, contracts, and planning forms supported
            </p>
            <p>• Analysis typically takes 2-3 minutes</p>
          </div>

          <Button
            variant="outline"
            className="mt-4"
            disabled={disabled}
            type="button"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileData) => (
            <Card key={fileData.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {fileData.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {fileData.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${fileData.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {fileData.progress}%
                      </span>
                    </div>
                  )}

                  {fileData.status === 'success' && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Uploaded</span>
                    </div>
                  )}

                  {fileData.status === 'error' && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Error</span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileData.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {fileData.error && (
                <Alert className="mt-3" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileData.error.message}</AlertDescription>
                </Alert>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
