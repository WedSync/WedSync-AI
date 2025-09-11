'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Image,
  Video,
  FileText,
  Music,
  Trash2,
  Edit3,
  Download,
  Search,
  Filter,
  Grid3X3,
  List,
  FolderPlus,
  Tag,
  Calendar,
  FileType,
  X,
  Check,
} from 'lucide-react';
import {
  MediaLibraryProps,
  MediaItem,
  MediaType,
  MediaLibraryState,
} from '@/types/cms';
import { cn } from '@/lib/utils';

// Media Library Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Handles file uploads, organization, and media management

interface MediaGridItemProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onDownload: (item: MediaItem) => void;
}

const MediaGridItem: React.FC<MediaGridItemProps> = ({
  item,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDownload,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-purple-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        'relative bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-100'
          : 'border-gray-200',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(item.id)}
    >
      {/* Selection Checkbox */}
      <div
        className={cn(
          'absolute top-3 right-3 z-10 transition-all duration-200',
          isSelected || isHovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center',
            isSelected
              ? 'bg-primary-600 border-primary-600'
              : 'bg-white border-gray-300',
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>

      {/* Media Preview */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {item.type === 'image' ? (
          <img
            src={item.url}
            alt={item.alt_text || item.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          getFileIcon(item.type)
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <h3
          className="text-sm font-medium text-gray-900 truncate"
          title={item.filename}
        >
          {item.filename}
        </h3>
        <p className="text-xs text-gray-500">
          {formatFileSize(item.size)} • {item.type.toUpperCase()}
        </p>
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {item.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-xs text-gray-500">
                +{item.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(item);
              }}
              className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface UploadZoneProps {
  onDrop: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onDrop,
  accept = 'image/*,video/*,.pdf,.doc,.docx',
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop],
  );

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFileDialog}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
        isDragOver
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
      )}
    >
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Upload Media Files
      </h3>
      <p className="text-gray-600 mb-4">
        Drag and drop files here, or click to browse
      </p>
      <p className="text-sm text-gray-500">
        Supports images, videos, and documents up to{' '}
        {Math.round(maxSize / (1024 * 1024))}MB
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  multiple = false,
  accept = 'image/*,video/*,.pdf,.doc,.docx',
  maxSize = 50 * 1024 * 1024,
  onSelect,
  onUpload,
  className,
  view: initialView = 'grid',
}) => {
  const [state, setState] = useState<MediaLibraryState>({
    items: [
      // Mock data for demonstration
      {
        id: '1',
        organization_id: 'org1',
        url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866',
        type: 'image',
        filename: 'wedding-photo-1.jpg',
        size: 2480000,
        alt_text: 'Beautiful wedding ceremony',
        tags: ['wedding', 'ceremony'],
        uploaded_by: 'user1',
        uploaded_at: '2025-01-30T10:00:00Z',
      },
      {
        id: '2',
        organization_id: 'org1',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        type: 'image',
        filename: 'engagement-session.jpg',
        size: 1920000,
        alt_text: 'Couple engagement photos',
        tags: ['engagement', 'couples'],
        uploaded_by: 'user1',
        uploaded_at: '2025-01-29T15:30:00Z',
      },
    ],
    selectedItems: [],
    view: initialView,
    sortBy: 'date',
    sortOrder: 'desc',
    filters: {},
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  const handleFileUpload = useCallback(
    (files: FileList) => {
      // Convert FileList to MediaItem array (mock implementation)
      const newItems: MediaItem[] = Array.from(files).map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        organization_id: 'org1',
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type.startsWith('audio/')
              ? 'audio'
              : 'document',
        filename: file.name,
        size: file.size,
        uploaded_by: 'current-user',
        uploaded_at: new Date().toISOString(),
        tags: [],
      }));

      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...newItems],
      }));

      onUpload?.(newItems);
    },
    [onUpload],
  );

  const handleItemSelect = useCallback(
    (id: string) => {
      if (multiple) {
        setState((prev) => ({
          ...prev,
          selectedItems: prev.selectedItems.includes(id)
            ? prev.selectedItems.filter((item) => item !== id)
            : [...prev.selectedItems, id],
        }));
      } else {
        setState((prev) => ({
          ...prev,
          selectedItems: [id],
        }));
      }
    },
    [multiple],
  );

  const handleItemEdit = useCallback((item: MediaItem) => {
    setEditingItem(item);
  }, []);

  const handleItemDelete = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      selectedItems: prev.selectedItems.filter((item) => item !== id),
    }));
  }, []);

  const handleItemDownload = useCallback((item: MediaItem) => {
    // Create download link
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const clearSelection = () => {
    setState((prev) => ({
      ...prev,
      selectedItems: [],
    }));
  };

  const selectFiles = () => {
    const selectedMediaItems = state.items.filter((item) =>
      state.selectedItems.includes(item.id),
    );
    onSelect?.(selectedMediaItems);
  };

  const filteredItems = state.items.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.filename.toLowerCase().includes(query) ||
        item.alt_text?.toLowerCase().includes(query) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className={cn('bg-white', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
          <div className="flex items-center gap-3">
            {state.selectedItems.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{state.selectedItems.length} selected</span>
                <button
                  onClick={clearSelection}
                  className="text-primary-600 hover:text-primary-700"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setState((prev) => ({ ...prev, view: 'grid' }))}
                className={cn(
                  'p-2 rounded-l-lg transition-colors',
                  state.view === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setState((prev) => ({ ...prev, view: 'list' }))}
                className={cn(
                  'p-2 rounded-r-lg transition-colors',
                  state.view === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search media files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              showFilters
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            {state.items.length === 0 ? (
              <UploadZone
                onDrop={handleFileUpload}
                accept={accept}
                multiple={multiple}
                maxSize={maxSize}
              />
            ) : (
              <div>
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No media found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              state.view === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'space-y-2',
            )}
          >
            {filteredItems.map((item) => (
              <MediaGridItem
                key={item.id}
                item={item}
                isSelected={state.selectedItems.includes(item.id)}
                onSelect={handleItemSelect}
                onEdit={handleItemEdit}
                onDelete={handleItemDelete}
                onDownload={handleItemDownload}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {onSelect && state.selectedItems.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {state.selectedItems.length} file
              {state.selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={selectFiles}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
            >
              Select Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
