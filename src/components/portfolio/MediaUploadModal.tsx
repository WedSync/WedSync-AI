'use client';

// WS-119: Media Upload Modal Component
// Team B Batch 9 Round 2

import React, { useState, useCallback } from 'react';
import {
  Upload,
  X,
  Image,
  Video,
  FileText,
  Star,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface MediaUploadModalProps {
  vendorId: string;
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
  uploadProgress?: number;
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/mov',
];

export function MediaUploadModal({
  vendorId,
  projectId,
  isOpen,
  onClose,
  onUploaded,
}: MediaUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form data for each file
  const [mediaData, setMediaData] = useState<{
    [key: string]: {
      title: string;
      caption: string;
      alt_text: string;
      tags: string[];
      is_cover: boolean;
    };
  }>({});

  const resetModal = () => {
    setFiles([]);
    setMediaData({});
    setError(null);
    setUploading(false);
    setDragOver(false);
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);

    const validFiles = fileArray.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 50MB.`);
        return false;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File "${file.name}" has an unsupported format.`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    const filesWithPreviews = validFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;

      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      return fileWithPreview;
    });

    setFiles((prev) => [...prev, ...filesWithPreviews]);

    // Initialize form data for each file
    filesWithPreviews.forEach((file) => {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      setMediaData((prev) => ({
        ...prev,
        [fileKey]: {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          caption: '',
          alt_text: '',
          tags: [],
          is_cover: false,
        },
      }));
    });

    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    const file = files[index];
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

    // Clean up preview URL
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaData((prev) => {
      const newData = { ...prev };
      delete newData[fileKey];
      return newData;
    });
  };

  const updateFileData = (index: number, field: string, value: any) => {
    const file = files[index];
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

    setMediaData((prev) => ({
      ...prev,
      [fileKey]: {
        ...prev[fileKey],
        [field]: value,
      },
    }));
  };

  const addTag = (index: number, tag: string) => {
    const file = files[index];
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
    const currentTags = mediaData[fileKey]?.tags || [];

    if (tag.trim() && !currentTags.includes(tag.trim())) {
      updateFileData(index, 'tags', [...currentTags, tag.trim()]);
    }
  };

  const removeTag = (index: number, tagToRemove: string) => {
    const file = files[index];
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
    const currentTags = mediaData[fileKey]?.tags || [];

    updateFileData(
      index,
      'tags',
      currentTags.filter((tag) => tag !== tagToRemove),
    );
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        const data = mediaData[fileKey];

        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendor_id', vendorId);

        if (projectId) {
          formData.append('project_id', projectId);
        }

        if (data.title) formData.append('title', data.title);
        if (data.caption) formData.append('caption', data.caption);
        if (data.alt_text) formData.append('alt_text', data.alt_text);
        if (data.tags.length > 0) formData.append('tags', data.tags.join(','));
        formData.append('is_cover', data.is_cover.toString());

        const response = await fetch('/api/portfolio/media', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        // Update progress
        setFiles((prev) =>
          prev.map((f, index) =>
            index === i ? { ...f, uploadProgress: 100 } : f,
          ),
        );
      }

      onUploaded();
      resetModal();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    if (file.type.startsWith('video/')) {
      return <Video className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        if (!uploading) {
          resetModal();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Portfolio Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* File Upload Area */}
          {files.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to browse
              </h3>
              <p className="text-gray-600 mb-4">
                Support for images (JPEG, PNG, WebP) and videos (MP4, WebM, MOV)
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = ALLOWED_TYPES.join(',');
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files) {
                      handleFileSelect(target.files);
                    }
                  };
                  input.click();
                }}
              >
                Browse Files
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Maximum file size: 50MB per file
              </p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">
                  Files to Upload ({files.length})
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = ALLOWED_TYPES.join(',');
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        handleFileSelect(target.files);
                      }
                    };
                    input.click();
                  }}
                >
                  Add More Files
                </Button>
              </div>

              {files.map((file, index) => {
                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                const data = mediaData[fileKey] || {
                  title: '',
                  caption: '',
                  alt_text: '',
                  tags: [],
                  is_cover: false,
                };

                return (
                  <div
                    key={fileKey}
                    className="bg-gray-50 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{file.name}</h4>
                          <p className="text-sm text-gray-600">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {file.uploadProgress !== undefined && (
                            <Progress
                              value={file.uploadProgress}
                              className="w-32 mt-1"
                            />
                          )}
                        </div>
                      </div>

                      {!uploading && (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <Input
                          value={data.title}
                          onChange={(e) =>
                            updateFileData(index, 'title', e.target.value)
                          }
                          placeholder="Media title..."
                          disabled={uploading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alt Text
                        </label>
                        <Input
                          value={data.alt_text}
                          onChange={(e) =>
                            updateFileData(index, 'alt_text', e.target.value)
                          }
                          placeholder="Describe the image..."
                          disabled={uploading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Caption
                      </label>
                      <Textarea
                        value={data.caption}
                        onChange={(e) =>
                          updateFileData(index, 'caption', e.target.value)
                        }
                        placeholder="Add a caption..."
                        rows={2}
                        disabled={uploading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Tag className="h-4 w-4 inline mr-1" />
                          Tags
                        </label>
                        <Input
                          placeholder="Type and press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const target = e.target as HTMLInputElement;
                              addTag(index, target.value);
                              target.value = '';
                            }
                          }}
                          disabled={uploading}
                        />
                        {data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {data.tags.map((tag, tagIndex) => (
                              <Badge
                                key={tagIndex}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() =>
                                  !uploading && removeTag(index, tag)
                                }
                              >
                                {tag}
                                {!uploading && <X className="h-3 w-3 ml-1" />}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Star className="h-4 w-4 inline mr-1" />
                          Cover Image
                        </label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={data.is_cover}
                            onCheckedChange={(checked) =>
                              updateFileData(index, 'is_cover', checked)
                            }
                            disabled={uploading}
                          />
                          <span className="text-sm text-gray-600">
                            Use as project cover
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {files.length > 0 && (
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!uploading) {
                    resetModal();
                    onClose();
                  }
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={uploadFiles}
                disabled={uploading}
              >
                {uploading
                  ? 'Uploading...'
                  : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
