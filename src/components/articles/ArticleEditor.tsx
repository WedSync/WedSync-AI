'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent, EditorContext } from '@tiptap/react';
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Save,
  Upload,
  Eye,
  Settings,
  Sparkles,
  FileText,
  Share,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  Article,
  CreateArticleRequest,
  ArticleCategory,
  SEOAnalysis,
  ContentDistributionRule,
} from '@/types/articles';

interface ArticleEditorProps {
  article?: Partial<Article>;
  categories: ArticleCategory[];
  onSave: (article: CreateArticleRequest) => Promise<void>;
  onPublish?: (articleId: string) => Promise<void>;
  onPreview?: (content: object) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function ArticleEditor({
  article,
  categories,
  onSave,
  onPublish,
  onPreview,
  isLoading = false,
  mode = 'create',
}: ArticleEditorProps) {
  // Editor state
  const [title, setTitle] = useState(article?.title || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    article?.category_ids || [],
  );
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState(
    article?.featured_image_url || '',
  );
  const [activeTab, setActiveTab] = useState<
    'editor' | 'seo' | 'distribution' | 'preview'
  >('editor');
  const [seoData, setSeoData] = useState({
    title: article?.seo_title || '',
    description: article?.seo_description || '',
    keywords: article?.seo_keywords || [],
  });
  const [distributionRules, setDistributionRules] = useState<
    Partial<ContentDistributionRule>[]
  >(article?.distribution_rules || []);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            'text-primary-600 hover:text-primary-700 underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your article...',
      }),
    ],
    content: article?.content || '<p>Start writing your article...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
  });

  // Memoize provider value for EditorContext
  const providerValue = useMemo(() => ({ editor }), [editor]);

  // Auto-save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleSave = useCallback(async () => {
    if (!editor || !title.trim()) return;

    setIsSaving(true);
    try {
      const articleData: CreateArticleRequest = {
        title: title.trim(),
        content: editor.getJSON(),
        category_ids: selectedCategories,
        tags,
        seo_title: seoData.title,
        seo_description: seoData.description,
        seo_keywords: seoData.keywords,
        featured_image_url: featuredImage || undefined,
        distribution_rules: distributionRules,
        status: 'draft',
      };

      await onSave(articleData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    editor,
    title,
    selectedCategories,
    tags,
    seoData,
    featuredImage,
    distributionRules,
    onSave,
  ]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (title.trim() && editor?.getHTML() !== '<p></p>') {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [handleSave, title, editor]);

  // Handle image uploads
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;

      // In a real implementation, upload to your storage service
      // For now, we'll use a placeholder
      const imageUrl = URL.createObjectURL(file);

      editor.chain().focus().setImage({ src: imageUrl }).run();
    },
    [editor],
  );

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <EditorContext.Provider value={providerValue}>
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-xs border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FileText className="h-6 w-6 text-gray-400" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {mode === 'create' ? 'Create Article' : 'Edit Article'}
                </h1>
                {lastSaved && (
                  <p className="text-sm text-gray-500">
                    Last saved: {format(lastSaved, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => onPreview?.(editor.getJSON())}
                className="btn-sm px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="btn-sm px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              {mode === 'edit' && article?.id && (
                <button
                  onClick={() => onPublish?.(article.id)}
                  className="btn-sm px-3 py-2 text-sm bg-success-600 hover:bg-success-700 text-white rounded-lg flex items-center space-x-2"
                >
                  <Share className="h-4 w-4" />
                  <span>Publish</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'editor', label: 'Editor', icon: FileText },
              { id: 'seo', label: 'SEO', icon: Sparkles },
              { id: 'distribution', label: 'Distribution', icon: Share },
              { id: 'preview', label: 'Preview', icon: Eye },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Article Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                />
              </div>

              {/* Editor Toolbar */}
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor.isActive('bold')
                      ? 'bg-gray-200 text-primary-600'
                      : 'text-gray-600'
                  }`}
                >
                  <strong>B</strong>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor.isActive('italic')
                      ? 'bg-gray-200 text-primary-600'
                      : 'text-gray-600'
                  }`}
                >
                  <em>I</em>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${
                    editor.isActive('underline')
                      ? 'bg-gray-200 text-primary-600'
                      : 'text-gray-600'
                  }`}
                >
                  <u>U</u>
                </button>

                <div className="w-px h-6 bg-gray-300" />

                <button
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                  }
                  className={`px-3 py-2 rounded hover:bg-gray-200 text-sm ${
                    editor.isActive('heading', { level: 1 })
                      ? 'bg-gray-200 text-primary-600'
                      : 'text-gray-600'
                  }`}
                >
                  H1
                </button>
                <button
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                  className={`px-3 py-2 rounded hover:bg-gray-200 text-sm ${
                    editor.isActive('heading', { level: 2 })
                      ? 'bg-gray-200 text-primary-600'
                      : 'text-gray-600'
                  }`}
                >
                  H2
                </button>

                <div className="w-px h-6 bg-gray-300" />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="p-2 rounded hover:bg-gray-200 text-gray-600 cursor-pointer flex items-center space-x-1"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Image</span>
                </label>
              </div>

              {/* Editor Content */}
              <div className="relative">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <EditorContent editor={editor} />

                  <FloatingMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    className="bg-white shadow-lg border border-gray-200 rounded-lg p-2 flex space-x-1"
                  >
                    <button
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                      }
                      className="px-3 py-1 text-sm rounded hover:bg-gray-100"
                    >
                      H1
                    </button>
                    <button
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                      className="px-3 py-1 text-sm rounded hover:bg-gray-100"
                    >
                      H2
                    </button>
                    <button
                      onClick={() =>
                        editor.chain().focus().setParagraph().run()
                      }
                      className="px-3 py-1 text-sm rounded hover:bg-gray-100"
                    >
                      P
                    </button>
                  </FloatingMenu>

                  <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    className="bg-white shadow-lg border border-gray-200 rounded-lg p-2 flex space-x-1"
                  >
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`px-2 py-1 text-sm rounded ${
                        editor.isActive('bold')
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                      className={`px-2 py-1 text-sm rounded ${
                        editor.isActive('italic')
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      Italic
                    </button>
                    <button
                      onClick={() => {
                        const url = window.prompt('URL');
                        if (url) {
                          editor
                            .chain()
                            .focus()
                            .extendMarkRange('link')
                            .setLink({ href: url })
                            .run();
                        }
                      }}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-100"
                    >
                      Link
                    </button>
                  </BubbleMenu>
                </div>
              </div>

              {/* Metadata Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([
                                ...selectedCategories,
                                category.id,
                              ]);
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter(
                                  (id) => id !== category.id,
                                ),
                              );
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label
                    htmlFor="tags"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tags
                  </label>
                  <div className="space-y-2">
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add tags... (press Enter or comma to add)"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1.5 h-3 w-3 text-primary-500 hover:text-primary-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Featured Image */}
              <div>
                <label
                  htmlFor="featured-image"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Featured Image URL
                </label>
                <input
                  id="featured-image"
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      SEO Optimization
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Optimize your article for search engines and social media
                      sharing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="seo-title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    SEO Title
                  </label>
                  <input
                    id="seo-title"
                    type="text"
                    value={seoData.title}
                    onChange={(e) =>
                      setSeoData({ ...seoData, title: e.target.value })
                    }
                    placeholder="Custom title for search engines..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {seoData.title.length}/60 characters (recommended: 50-60)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="seo-description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    SEO Description
                  </label>
                  <textarea
                    id="seo-description"
                    value={seoData.description}
                    onChange={(e) =>
                      setSeoData({ ...seoData, description: e.target.value })
                    }
                    placeholder="Brief description for search results..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {seoData.description.length}/160 characters (recommended:
                    150-160)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="seo-keywords"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    SEO Keywords
                  </label>
                  <input
                    id="seo-keywords"
                    type="text"
                    value={seoData.keywords.join(', ')}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        keywords: e.target.value
                          .split(',')
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="wedding flowers, bridal bouquet, seasonal blooms..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Separate keywords with commas
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'distribution' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <Share className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Content Distribution
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      Configure when and how this article appears in client
                      dashboards.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>
                  Distribution rules configuration will be implemented in the
                  next iteration.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex">
                  <Eye className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800">
                      Article Preview
                    </h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Preview how your article will appear to readers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                {featuredImage && (
                  <img
                    src={featuredImage}
                    alt={title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {title || 'Untitled Article'}
                </h1>

                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedCategories.map((categoryId) => {
                      const category = categories.find(
                        (c) => c.id === categoryId,
                      );
                      return category ? (
                        <span
                          key={categoryId}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {category.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="prose prose-lg max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
                </div>

                {tags.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </EditorContext.Provider>
  );
}
