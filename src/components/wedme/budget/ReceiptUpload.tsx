'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Camera,
  Download,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptFile {
  id: string;
  file: File;
  preview?: string;
  processed?: boolean;
  extractedData?: {
    amount?: number;
    vendor?: string;
    date?: string;
    description?: string;
  };
}

interface ReceiptUploadProps {
  onFilesChange: (files: ReceiptFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
  showOCRProcessing?: boolean;
}

export function ReceiptUpload({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  className,
  disabled = false,
  showOCRProcessing = true,
}: ReceiptUploadProps) {
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(
    new Set(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported.`;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum ${maxSize}MB.`;
    }

    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }

    return null;
  };

  const processFile = async (file: File): Promise<ReceiptFile> => {
    const id = `${file.name}-${Date.now()}`;
    const receiptFile: ReceiptFile = {
      id,
      file,
      processed: false,
    };

    if (file.type.startsWith('image/')) {
      try {
        const preview = await createPreview(file);
        receiptFile.preview = preview;
      } catch (error) {
        console.warn('Failed to create preview:', error);
      }
    }

    if (showOCRProcessing) {
      setProcessingFiles((prev) => new Set([...prev, id]));
      try {
        const extractedData = await processWithOCR(file);
        receiptFile.extractedData = extractedData;
        receiptFile.processed = true;
      } catch (error) {
        console.warn('OCR processing failed:', error);
        receiptFile.processed = false;
      } finally {
        setProcessingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }

    return receiptFile;
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processWithOCR = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/budget/receipts/process', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('OCR processing failed');
    }

    const result = await response.json();
    return result.success ? result.data : null;
  };

  const handleFiles = async (fileList: FileList) => {
    setUploadError(null);
    const newFiles: ReceiptFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);

      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }

      try {
        const receiptFile = await processFile(file);
        newFiles.push(receiptFile);
      } catch (error) {
        errors.push(`${file.name}: Failed to process file`);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          dragActive && !disabled
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-3">
          <div className="flex justify-center">
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                dragActive ? 'bg-primary-100' : 'bg-gray-100',
              )}
            >
              <Upload
                className={cn(
                  'w-6 h-6',
                  dragActive ? 'text-primary-600' : 'text-gray-400',
                )}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Upload Receipt Files
            </h3>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              >
                browse
              </button>
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Supports: JPG, PNG, GIF, PDF</p>
            <p>
              Max size: {maxSize}MB per file • Max files: {maxFiles}
            </p>
            {showOCRProcessing && (
              <p>
                Auto-extraction enabled - data will be extracted from receipts
              </p>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-error-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-error-800">
                Upload Error
              </h4>
              <p className="text-sm text-error-700 whitespace-pre-line mt-1">
                {uploadError}
              </p>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Files ({files.length}/{maxFiles})
          </h4>

          <div className="space-y-2">
            {files.map((receiptFile) => {
              const isProcessing = processingFiles.has(receiptFile.id);

              return (
                <div
                  key={receiptFile.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-shrink-0">
                    {receiptFile.preview ? (
                      <img
                        src={receiptFile.preview}
                        alt="Receipt preview"
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400">
                        {getFileIcon(receiptFile.file)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {receiptFile.file.name}
                      </p>

                      {isProcessing && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs">Processing...</span>
                        </div>
                      )}

                      {receiptFile.processed && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-3 h-3" />
                          <span className="text-xs">Processed</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(receiptFile.file.size)}
                      </span>

                      {receiptFile.extractedData && (
                        <div className="text-xs text-gray-600">
                          {receiptFile.extractedData.amount && (
                            <span className="inline-flex items-center gap-1">
                              Amount: ${receiptFile.extractedData.amount}
                            </span>
                          )}
                          {receiptFile.extractedData.vendor && (
                            <span className="inline-flex items-center gap-1 ml-2">
                              Vendor: {receiptFile.extractedData.vendor}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeFile(receiptFile.id)}
                      className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            Add More Files
          </button>

          {files.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                onFilesChange([]);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
