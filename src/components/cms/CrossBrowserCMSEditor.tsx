'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  Save,
  Eye,
  Upload,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

import { BrowserDetectionService } from '@/lib/compatibility/browser-detection';
import { PlatformKeyManager } from '@/lib/compatibility/platform-keys';

interface CrossBrowserCMSEditorProps {
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  onPreview?: () => void;
  placeholder?: string;
  className?: string;
}

export function CrossBrowserCMSEditor({
  initialContent = '',
  onSave,
  onPreview,
  placeholder = 'Start writing your wedding content...',
  className = '',
}: CrossBrowserCMSEditorProps) {
  const [browserInfo] = useState(() => BrowserDetectionService.getInstance());
  const [platformKeys] = useState(() => PlatformKeyManager.getInstance());
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get browser capabilities
  const capabilities = browserInfo.getCapabilities();
  const performanceHints = browserInfo.getPerformanceHints();

  // Initialize Tiptap editor with cross-browser optimizations
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable problematic features on older browsers
        history: capabilities.editor.undoRedo,
        dropcursor: capabilities.features.dragAndDrop,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
        allowBase64: !capabilities.isMobile, // Avoid base64 on mobile for memory
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 hover:text-primary-700 underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline.configure({
        // Safari sometimes has issues with underline
        HTMLAttributes:
          capabilities.name === 'safari' ? {} : { class: 'underline' },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4 ${
          capabilities.name === 'safari' ? 'safari-editor' : ''
        } ${capabilities.isMobile ? 'mobile-editor' : 'desktop-editor'}`,
        spellcheck: capabilities.editor.spellCheck ? 'true' : 'false',
      },
      // Handle paste events with browser-specific logic
      handlePaste: (view, event) => {
        if (!capabilities.editor.richPaste) {
          // Fallback for browsers with poor paste support
          const text = event.clipboardData?.getData('text/plain');
          if (text) {
            view.dispatch(view.state.tr.insertText(text));
            return true;
          }
        }
        return false;
      },
      // Handle drag and drop for wedding photos
      handleDrop: (view, event) => {
        if (!capabilities.features.dragAndDrop) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Throttled auto-save based on browser performance
      clearTimeout((window as any).autoSaveTimeout);
      (window as any).autoSaveTimeout = setTimeout(() => {
        handleAutoSave(editor.getHTML());
      }, performanceHints.autoSaveInterval);
    },
  });

  // Setup platform-specific keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    platformKeys.registerWeddingCMSBindings({
      bold: () => editor.chain().focus().toggleBold().run(),
      italic: () => editor.chain().focus().toggleItalic().run(),
      underline: () => editor.chain().focus().toggleUnderline().run(),
      save: () => {
        handleSave();
        return true; // Prevent default save dialog
      },
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      link: () => handleAddLink(),
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      heading1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      heading2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      preview: () => {
        onPreview?.();
        return true;
      },
    });

    // Add keyboard event listener
    const handleKeyDown = (event: KeyboardEvent) => {
      platformKeys.handleKeyEvent(event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, platformKeys]);

  // Check for compatibility issues on mount
  useEffect(() => {
    const warnings = browserInfo.getWeddingVendorRecommendations();
    setCompatibilityWarnings(warnings);

    // Log browser info for debugging
    if (process.env.NODE_ENV === 'development') {
      browserInfo.logCapabilities();
    }
  }, [browserInfo]);

  const handleSave = useCallback(async () => {
    if (!editor || !onSave) return;

    setIsLoading(true);
    try {
      await onSave(editor.getHTML());
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [editor, onSave]);

  const handleAutoSave = useCallback(
    async (content: string) => {
      if (!onSave) return;

      try {
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    },
    [onSave],
  );

  const handleAddLink = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter URL:');
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;

      // Validate file size based on browser capabilities
      const maxSize = capabilities.isMobile
        ? 5 * 1024 * 1024
        : 10 * 1024 * 1024; // 5MB mobile, 10MB desktop
      if (file.size > maxSize) {
        alert(`Image too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return;
      }

      setIsLoading(true);
      try {
        // Create object URL for immediate display
        const imageUrl = URL.createObjectURL(file);
        editor.chain().focus().setImage({ src: imageUrl }).run();

        // TODO: Upload to actual storage and replace URL
        // This would be your wedding photo upload logic
      } catch (error) {
        console.error('Image upload failed:', error);
      } finally {
        setIsLoading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [editor, capabilities],
  );

  const getToolbarButtonClass = (isActive: boolean) => {
    const baseClass = 'p-2 rounded hover:bg-gray-100 transition-colors';
    const activeClass = isActive
      ? 'bg-primary-100 text-primary-700'
      : 'text-gray-600';

    // Safari needs slightly different hover states
    const safariClass =
      capabilities.name === 'safari' ? 'hover:bg-gray-50' : '';

    return `${baseClass} ${activeClass} ${safariClass}`;
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-xl bg-white ${className}`}>
      {/* Compatibility Warnings */}
      {compatibilityWarnings.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                Browser Compatibility Notice
              </p>
              <ul className="mt-1 text-yellow-700 space-y-1">
                {compatibilityWarnings.map((warning, index) => (
                  <li key={index} className="text-xs">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Text Formatting */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={getToolbarButtonClass(editor.isActive('bold'))}
              title={`Bold (${platformKeys.getKeyDisplayString({ key: 'b', ctrlKey: !capabilities.platform.includes('mac'), metaKey: capabilities.platform.includes('mac') })})`}
            >
              <Bold className="h-4 w-4" />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={getToolbarButtonClass(editor.isActive('italic'))}
              title={`Italic (${platformKeys.getKeyDisplayString({ key: 'i', ctrlKey: !capabilities.platform.includes('mac'), metaKey: capabilities.platform.includes('mac') })})`}
            >
              <Italic className="h-4 w-4" />
            </button>

            <div className="w-px h-6 bg-gray-300" />

            {/* Lists */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={getToolbarButtonClass(editor.isActive('bulletList'))}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>

            <div className="w-px h-6 bg-gray-300" />

            {/* Insert Link */}
            <button
              onClick={handleAddLink}
              className={getToolbarButtonClass(editor.isActive('link'))}
              title="Add Link"
              disabled={!capabilities.editor.richPaste}
            >
              <LinkIcon className="h-4 w-4" />
            </button>

            {/* Insert Image */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={!capabilities.features.fileAPI}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={getToolbarButtonClass(false)}
              title="Upload Wedding Photo"
              disabled={!capabilities.features.fileAPI || isLoading}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Save Status */}
            {lastSaved && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Preview Button */}
            {onPreview && (
              <button
                onClick={onPreview}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
            )}

            {/* Save Button */}
            {onSave && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Keyboard Shortcuts Hint */}
        {capabilities.isMobile && (
          <div className="mt-2 text-xs text-gray-500">
            Tip: Tap and hold text to access formatting options
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={`
            ${capabilities.isMobile ? 'min-h-[200px]' : 'min-h-[300px]'}
            ${capabilities.name === 'safari' ? 'safari-prose' : ''}
            ${capabilities.name === 'firefox' ? 'firefox-prose' : ''}
          `}
        />

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Browser-specific styles */}
      <style jsx>{`
        .safari-editor {
          /* Safari-specific text rendering optimizations */
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .mobile-editor {
          /* Mobile-specific touch optimizations */
          -webkit-touch-callout: none;
          -webkit-user-select: text;
          user-select: text;
        }

        .desktop-editor {
          /* Desktop-specific optimizations */
          cursor: text;
        }

        .safari-prose {
          /* Safari-specific prose styling */
          word-break: break-word;
          -webkit-hyphens: auto;
          hyphens: auto;
        }

        .firefox-prose {
          /* Firefox-specific optimizations */
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
}
