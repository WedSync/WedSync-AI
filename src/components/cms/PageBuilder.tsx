'use client';

import React, { useState, useCallback } from 'react';
import {
  Type,
  Image,
  Video,
  Layout,
  Users,
  Calendar,
  Star,
  Plus,
  Trash2,
  Edit3,
  Move,
  Copy,
  Eye,
  Settings,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { PageBuilderProps, PageBlock, PageTemplate } from '@/types/cms';
import { cn } from '@/lib/utils';

// Page Builder Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Visual drag-and-drop interface for building client portal pages

interface BlockTypeDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'content' | 'media' | 'interactive' | 'layout';
}

const blockTypes: BlockTypeDefinition[] = [
  {
    id: 'text',
    name: 'Text Block',
    icon: Type,
    description: 'Rich text content with formatting',
    category: 'content',
  },
  {
    id: 'image',
    name: 'Image',
    icon: Image,
    description: 'Single image with caption',
    category: 'media',
  },
  {
    id: 'gallery',
    name: 'Photo Gallery',
    icon: Layout,
    description: 'Grid of wedding photos',
    category: 'media',
  },
  {
    id: 'video',
    name: 'Video',
    icon: Video,
    description: 'Embedded video player',
    category: 'media',
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    icon: Star,
    description: 'Client review or testimonial',
    category: 'content',
  },
  {
    id: 'timeline',
    name: 'Wedding Timeline',
    icon: Calendar,
    description: 'Wedding day schedule',
    category: 'interactive',
  },
  {
    id: 'team',
    name: 'Team Members',
    icon: Users,
    description: 'Staff profiles and bios',
    category: 'content',
  },
];

interface BlockEditorProps {
  block: PageBlock;
  onUpdate: (block: PageBlock) => void;
  onClose: () => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const [editingBlock, setEditingBlock] = useState<PageBlock>(block);

  const handleSave = () => {
    onUpdate(editingBlock);
    onClose();
  };

  const handleStyleChange = (key: string, value: string) => {
    setEditingBlock((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        [key]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden shadow-xl">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {blockTypes.find((t) => t.id === block.type)?.name}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-5 w-5 rotate-45" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Content Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              {block.type === 'text' && (
                <textarea
                  value={editingBlock.content?.text || ''}
                  onChange={(e) =>
                    setEditingBlock((prev) => ({
                      ...prev,
                      content: { ...prev.content, text: e.target.value },
                    }))
                  }
                  placeholder="Enter your text content..."
                  rows={6}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              )}

              {block.type === 'image' && (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={editingBlock.content?.src || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, src: e.target.value },
                      }))
                    }
                    placeholder="Image URL"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                  <input
                    type="text"
                    value={editingBlock.content?.alt || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, alt: e.target.value },
                      }))
                    }
                    placeholder="Alt text"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                  <input
                    type="text"
                    value={editingBlock.content?.caption || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, caption: e.target.value },
                      }))
                    }
                    placeholder="Caption (optional)"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              )}

              {block.type === 'testimonial' && (
                <div className="space-y-3">
                  <textarea
                    value={editingBlock.content?.quote || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, quote: e.target.value },
                      }))
                    }
                    placeholder="Client testimonial..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                  <input
                    type="text"
                    value={editingBlock.content?.author || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, author: e.target.value },
                      }))
                    }
                    placeholder="Client name"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                  <input
                    type="text"
                    value={editingBlock.content?.role || ''}
                    onChange={(e) =>
                      setEditingBlock((prev) => ({
                        ...prev,
                        content: { ...prev.content, role: e.target.value },
                      }))
                    }
                    placeholder="Wedding date or role"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              )}
            </div>

            {/* Styling Options */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                Styling
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={editingBlock.style?.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      handleStyleChange('backgroundColor', e.target.value)
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={editingBlock.style?.textColor || '#000000'}
                    onChange={(e) =>
                      handleStyleChange('textColor', e.target.value)
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Text Alignment
                </label>
                <div className="flex items-center gap-1">
                  {[
                    { value: 'left', icon: AlignLeft },
                    { value: 'center', icon: AlignCenter },
                    { value: 'right', icon: AlignRight },
                  ].map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleStyleChange('alignment', value)}
                      className={cn(
                        'p-2 rounded-lg border transition-colors',
                        editingBlock.style?.alignment === value
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

interface PageBlockComponentProps {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

const PageBlockComponent: React.FC<PageBlockComponentProps> = ({
  block,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="p-4">
            <Type className="h-6 w-6 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {block.content?.text || 'Click to add text content...'}
            </p>
          </div>
        );

      case 'image':
        return (
          <div className="p-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              {block.content?.src ? (
                <img
                  src={block.content.src}
                  alt={block.content.alt}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Image className="h-8 w-8 text-gray-400" />
              )}
            </div>
            {block.content?.caption && (
              <p className="text-xs text-gray-500">{block.content.caption}</p>
            )}
          </div>
        );

      case 'testimonial':
        return (
          <div className="p-4">
            <Star className="h-6 w-6 text-yellow-400 mb-2" />
            <blockquote className="text-sm text-gray-600 italic mb-2">
              "{block.content?.quote || 'Add client testimonial...'}"
            </blockquote>
            <cite className="text-xs text-gray-500">
              — {block.content?.author || 'Client Name'}{' '}
              {block.content?.role && `, ${block.content.role}`}
            </cite>
          </div>
        );

      case 'gallery':
        return (
          <div className="p-4">
            <Layout className="h-6 w-6 text-gray-400 mb-2" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-400">
              {React.createElement(
                blockTypes.find((t) => t.id === block.type)?.icon || Type,
                { className: 'h-6 w-6' },
              )}
              <span className="text-sm">
                {blockTypes.find((t) => t.id === block.type)?.name ||
                  'Unknown Block'}
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        'relative bg-white border rounded-xl transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-100'
          : 'border-gray-200',
        isHovered && 'shadow-md',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      style={{
        backgroundColor: block.style?.backgroundColor,
        color: block.style?.textColor,
      }}
    >
      {renderBlockContent()}

      {/* Block Controls */}
      {(isSelected || isHovered) && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Move up"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Move down"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const PageBuilder: React.FC<PageBuilderProps> = ({
  initialBlocks = [],
  templates = [],
  onChange,
  onSave,
  className,
}) => {
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<PageBlock | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const addBlock = useCallback(
    (type: string) => {
      const newBlock: PageBlock = {
        id: `block-${Date.now()}`,
        type: type as any,
        content: {},
        style: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          alignment: 'left',
        },
        order: blocks.length,
      };

      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      onChange?.(newBlocks);
    },
    [blocks, onChange],
  );

  const updateBlock = useCallback(
    (updatedBlock: PageBlock) => {
      const newBlocks = blocks.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block,
      );
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    },
    [blocks, onChange],
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const newBlocks = blocks.filter((block) => block.id !== id);
      setBlocks(newBlocks);
      setSelectedBlockId(null);
      onChange?.(newBlocks);
    },
    [blocks, onChange],
  );

  const moveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const blockIndex = blocks.findIndex((block) => block.id === id);
      if (blockIndex === -1) return;

      const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
      if (newIndex < 0 || newIndex >= blocks.length) return;

      const newBlocks = [...blocks];
      [newBlocks[blockIndex], newBlocks[newIndex]] = [
        newBlocks[newIndex],
        newBlocks[blockIndex],
      ];

      // Update order values
      newBlocks.forEach((block, index) => {
        block.order = index;
      });

      setBlocks(newBlocks);
      onChange?.(newBlocks);
    },
    [blocks, onChange],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const blockToDuplicate = blocks.find((block) => block.id === id);
      if (!blockToDuplicate) return;

      const duplicatedBlock: PageBlock = {
        ...blockToDuplicate,
        id: `block-${Date.now()}`,
        order: blocks.length,
      };

      const newBlocks = [...blocks, duplicatedBlock];
      setBlocks(newBlocks);
      onChange?.(newBlocks);
    },
    [blocks, onChange],
  );

  const handleSave = () => {
    onSave?.(blocks);
  };

  return (
    <div className={cn('bg-gray-50', className)}>
      <div className="flex h-screen">
        {/* Sidebar - Block Types */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Page Builder
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={cn(
                  'flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                  previewMode
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                <Eye className="h-4 w-4" />
                {previewMode ? 'Exit Preview' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Save
              </button>
            </div>
          </div>

          {!previewMode && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Block Types by Category */}
                {['content', 'media', 'interactive'].map((category) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 capitalize">
                      {category} Blocks
                    </h3>
                    <div className="space-y-2">
                      {blockTypes
                        .filter((type) => type.category === category)
                        .map((blockType) => (
                          <button
                            key={blockType.id}
                            onClick={() => addBlock(blockType.id)}
                            className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200 group"
                          >
                            <div className="flex items-start gap-3">
                              <blockType.icon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  {blockType.name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {blockType.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                {previewMode ? 'Preview Mode' : 'Design Mode'}
              </h3>
              <div className="text-sm text-gray-500">
                {blocks.length} block{blocks.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {blocks.length === 0 ? (
                <div className="text-center py-16">
                  <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Building Your Page
                  </h3>
                  <p className="text-gray-600">
                    Add blocks from the sidebar to create your client portal
                    page
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {blocks.map((block) => (
                    <PageBlockComponent
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onEdit={() => setEditingBlock(block)}
                      onDelete={() => deleteBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, 'up')}
                      onMoveDown={() => moveBlock(block.id, 'down')}
                      onDuplicate={() => duplicateBlock(block.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block Editor Modal */}
      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onUpdate={updateBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

export default PageBuilder;
