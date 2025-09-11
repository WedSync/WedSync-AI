'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  Video,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { ContentEditorProps, EditorState } from '@/types/cms';
import { cn } from '@/lib/utils';

// Rich Text Editor Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Supports content creation, editing, and media embedding

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      // Base styles
      'p-2 rounded-lg text-sm font-medium transition-all duration-200',
      'focus:outline-none focus:ring-4 focus:ring-primary-100',
      'flex items-center justify-center',

      // Active state
      isActive
        ? 'bg-primary-600 text-white shadow-sm'
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200',

      // Disabled state
      disabled && 'opacity-50 cursor-not-allowed',
    )}
  >
    {children}
  </button>
);

interface FormatSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const FormatSelect: React.FC<FormatSelectProps> = ({
  value,
  onChange,
  options,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const ContentEditor: React.FC<ContentEditorProps> = ({
  initialContent,
  placeholder = 'Start writing your content...',
  onChange,
  onSave,
  readOnly = false,
  config,
  className,
}) => {
  const [editorState, setEditorState] = useState<EditorState>({
    content: initialContent || null,
    wordCount: 0,
    characterCount: 0,
    isDirty: false,
    isValid: true,
    errors: [],
  });

  const [currentFormat, setCurrentFormat] = useState('paragraph');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Format options for dropdown
  const formatOptions = [
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'heading1', label: 'Heading 1' },
    { value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' },
    { value: 'heading4', label: 'Heading 4' },
    { value: 'heading5', label: 'Heading 5' },
    { value: 'heading6', label: 'Heading 6' },
  ];

  // Simulate editor content changes
  const handleContentChange = useCallback(
    (newContent: any) => {
      const newState: EditorState = {
        ...editorState,
        content: newContent,
        isDirty: true,
        wordCount: getWordCount(newContent),
        characterCount: getCharacterCount(newContent),
      };

      setEditorState(newState);
      onChange?.(newContent);
    },
    [editorState, onChange],
  );

  // Utility functions for content analysis
  const getWordCount = (content: any): number => {
    if (!content) return 0;
    // Simulate word counting from rich text content
    return content.toString().split(/\s+/).filter(Boolean).length;
  };

  const getCharacterCount = (content: any): number => {
    if (!content) return 0;
    return content.toString().length;
  };

  // Formatting commands
  const toggleBold = () => {
    console.log('Toggle bold formatting');
    // Implement bold toggle logic
  };

  const toggleItalic = () => {
    console.log('Toggle italic formatting');
    // Implement italic toggle logic
  };

  const toggleUnderline = () => {
    console.log('Toggle underline formatting');
    // Implement underline toggle logic
  };

  const toggleStrikethrough = () => {
    console.log('Toggle strikethrough formatting');
    // Implement strikethrough toggle logic
  };

  const insertBulletList = () => {
    console.log('Insert bullet list');
    // Implement bullet list logic
  };

  const insertOrderedList = () => {
    console.log('Insert ordered list');
    // Implement ordered list logic
  };

  const insertBlockquote = () => {
    console.log('Insert blockquote');
    // Implement blockquote logic
  };

  const insertCode = () => {
    console.log('Insert code block');
    // Implement code block logic
  };

  const setAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    console.log('Set alignment:', alignment);
    // Implement text alignment logic
  };

  const undo = () => {
    console.log('Undo last action');
    // Implement undo logic
  };

  const redo = () => {
    console.log('Redo last action');
    // Implement redo logic
  };

  const handleFormatChange = (format: string) => {
    setCurrentFormat(format);
    console.log('Change format to:', format);
    // Implement format change logic
  };

  const openLinkDialog = () => {
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      console.log('Insert link:', linkUrl);
      // Implement link insertion logic
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  const openMediaLibrary = () => {
    setShowMediaLibrary(true);
  };

  const insertMedia = (mediaUrl: string, type: 'image' | 'video') => {
    console.log('Insert media:', { mediaUrl, type });
    // Implement media insertion logic
    setShowMediaLibrary(false);
  };

  const saveContent = () => {
    if (onSave && editorState.content) {
      onSave({
        id: '',
        organization_id: '',
        title: '',
        body: editorState.content,
        status: 'draft',
        type: 'custom',
        media_urls: [],
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        is_template: false,
      });
    }
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Selector */}
          <FormatSelect
            value={currentFormat}
            onChange={handleFormatChange}
            options={formatOptions}
          />

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={toggleBold} title="Bold">
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={toggleItalic} title="Italic">
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={toggleUnderline} title="Underline">
              <Underline className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={toggleStrikethrough} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => setAlignment('left')}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setAlignment('center')}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setAlignment('right')}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setAlignment('justify')}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Lists and Blocks */}
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={insertBulletList} title="Bullet List">
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertOrderedList} title="Numbered List">
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertBlockquote} title="Quote">
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertCode} title="Code">
              <Code className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Media and Links */}
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={openLinkDialog} title="Insert Link">
              <Link className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={openMediaLibrary} title="Insert Image">
              <Image className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={openMediaLibrary} title="Insert Video">
              <Video className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* History */}
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={undo} title="Undo">
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={redo} title="Redo">
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative">
        <div
          className={cn(
            'min-h-[400px] p-6 text-gray-900 focus:outline-none',
            'text-md leading-6',
            readOnly && 'bg-gray-50',
          )}
          contentEditable={!readOnly}
          suppressContentEditableWarning={true}
          onInput={(e) => handleContentChange(e.currentTarget.textContent)}
          data-placeholder={placeholder}
          style={
            {
              '--placeholder-color': '#9CA3AF',
            } as React.CSSProperties
          }
        >
          {/* Content will be rendered here */}
          {!editorState.content && (
            <div className="text-gray-500 pointer-events-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>{editorState.wordCount} words</span>
            <span>{editorState.characterCount} characters</span>
            {editorState.isDirty && (
              <span className="text-amber-600">• Unsaved changes</span>
            )}
          </div>

          {!readOnly && (
            <button
              onClick={saveContent}
              disabled={!editorState.isDirty}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-4 focus:ring-primary-100',
                editorState.isDirty
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-xs'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed',
              )}
            >
              Save Content
            </button>
          )}
        </div>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Insert Link
              </h3>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                autoFocus
              />
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={insertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal Placeholder */}
      {showMediaLibrary && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 h-[80vh] shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Media Library
              </h3>
            </div>
            <div className="p-6 flex items-center justify-center h-96">
              <div className="text-center">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  Media Library component will be integrated here
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
