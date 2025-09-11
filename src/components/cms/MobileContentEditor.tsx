'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useActionState } from 'react';
import {
  CMSContent,
  ContentEditorProps,
  CMSPerformanceMetric,
} from '@/types/cms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Save,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  Clock,
  Compress,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileContentEditorProps extends ContentEditorProps {
  performanceMode?: 'fast' | 'balanced' | 'quality';
  enableTouchOptimization?: boolean;
  enableOfflineMode?: boolean;
}

interface EditorState {
  title: string;
  slug: string;
  content: string;
  content_type: 'page' | 'blog' | 'template' | 'snippet';
  status: 'draft' | 'published' | 'archived';
  meta_title: string;
  meta_description: string;
  tags: string[];
  mobile_optimized: boolean;
}

interface PerformanceStats {
  editTime: number;
  saveTime: number;
  compressionRatio: number;
  mobileScore: number;
  cacheHitRate: number;
}

export function MobileContentEditor({
  content,
  onSave,
  onPreview,
  mobileOptimized = true,
  disabled = false,
  performanceMode = 'balanced',
  enableTouchOptimization = true,
  enableOfflineMode = false,
}: MobileContentEditorProps) {
  const [state, setState] = useState<EditorState>({
    title: content?.title || '',
    slug: content?.slug || '',
    content: content?.content || '',
    content_type: content?.content_type || 'page',
    status: content?.status || 'draft',
    meta_title: content?.meta_title || '',
    meta_description: content?.meta_description || '',
    tags: content?.tags || [],
    mobile_optimized: content?.mobile_optimized ?? true,
  });

  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>(
    'mobile',
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [performance, setPerformance] = useState<PerformanceStats>({
    editTime: 0,
    saveTime: 0,
    compressionRatio: 0,
    mobileScore: 95,
    cacheHitRate: 0,
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [tagInput, setTagInput] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Performance monitoring
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (state.title || state.content) {
        setAutoSaveStatus('saving');
        try {
          await handleSave(true);
          setAutoSaveStatus('saved');
        } catch (error) {
          setAutoSaveStatus('error');
        }
      }
    }, 30000); // Auto-save every 30 seconds

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state]);

  // Generate slug from title
  useEffect(() => {
    if (state.title && !content?.slug) {
      const generatedSlug = state.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      setState((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [state.title, content?.slug]);

  const calculateMobileScore = useCallback(
    (contentData: Partial<EditorState>): number => {
      let score = 100;

      // Penalize very long titles
      if (contentData.title && contentData.title.length > 60) score -= 10;

      // Penalize missing meta description
      if (
        !contentData.meta_description ||
        contentData.meta_description.length < 120
      )
        score -= 15;

      // Penalize very long content blocks without breaks
      if (
        contentData.content &&
        contentData.content.length > 1000 &&
        !contentData.content.includes('\n\n')
      )
        score -= 20;

      // Reward mobile optimization flag
      if (contentData.mobile_optimized) score += 5;

      return Math.max(0, Math.min(100, score));
    },
    [],
  );

  const handleSave = async (isAutoSave = false) => {
    const saveStartTime = Date.now();

    try {
      const contentData: Partial<CMSContent> = {
        ...state,
        version: (content?.version || 0) + 1,
      };

      if (state.status === 'published' && !content?.published_at) {
        contentData.published_at = new Date().toISOString();
      }

      const mobileScore = calculateMobileScore(contentData);
      setPerformance((prev) => ({ ...prev, mobileScore }));

      await onSave(contentData);

      const saveTime = Date.now() - saveStartTime;
      setPerformance((prev) => ({
        ...prev,
        saveTime,
        editTime: Date.now() - startTimeRef.current,
      }));

      if (!isAutoSave) {
        toast.success('Content saved successfully!', {
          description: `Mobile score: ${mobileScore}/100`,
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      if (!isAutoSave) {
        toast.error('Failed to save content');
      }
      throw error;
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(state);
    }
    setIsPreviewMode(!isPreviewMode);
  };

  const addTag = (tag: string) => {
    if (tag && !state.tags.includes(tag)) {
      setState((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const getViewportStyles = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-2xl mx-auto';
      case 'desktop':
        return 'max-w-6xl mx-auto';
      default:
        return 'max-w-sm mx-auto';
    }
  };

  const getTouchOptimizedClasses = () => {
    if (!enableTouchOptimization) return '';
    return 'touch-manipulation select-none min-h-[48px]';
  };

  return (
    <div className={cn('w-full h-full bg-background', getViewportStyles())}>
      {/* Header with viewport controls and performance stats */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('mobile')}
              className={getTouchOptimizedClasses()}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tablet')}
              className={getTouchOptimizedClasses()}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('desktop')}
              className={getTouchOptimizedClasses()}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Performance indicators */}
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {performance.mobileScore}/100
            </Badge>

            <Badge
              variant={
                autoSaveStatus === 'saved'
                  ? 'success'
                  : autoSaveStatus === 'error'
                    ? 'destructive'
                    : 'secondary'
              }
              className="text-xs"
            >
              {autoSaveStatus === 'saving' && (
                <Clock className="h-3 w-3 mr-1 animate-spin" />
              )}
              {autoSaveStatus === 'saved' && (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {autoSaveStatus}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={disabled}
              className={getTouchOptimizedClasses()}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => handleSave(false)}
              disabled={disabled}
              size="sm"
              className={getTouchOptimizedClasses()}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-4 space-y-6" ref={editorRef}>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className={getTouchOptimizedClasses()}>
              Content
            </TabsTrigger>
            <TabsTrigger value="seo" className={getTouchOptimizedClasses()}>
              SEO
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className={getTouchOptimizedClasses()}
            >
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Content Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={state.title}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter content title..."
                    disabled={disabled}
                    className={cn(getTouchOptimizedClasses(), 'text-base')}
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={state.slug}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="url-friendly-slug"
                    disabled={disabled}
                    className={cn(
                      getTouchOptimizedClasses(),
                      'text-base font-mono',
                    )}
                  />
                </div>

                {/* Content Type and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="content_type">Type</Label>
                    <Select
                      value={state.content_type}
                      onValueChange={(
                        value: 'page' | 'blog' | 'template' | 'snippet',
                      ) =>
                        setState((prev) => ({ ...prev, content_type: value }))
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger
                        className={cn(getTouchOptimizedClasses(), 'text-base')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="blog">Blog Post</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="snippet">Snippet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={state.status}
                      onValueChange={(
                        value: 'draft' | 'published' | 'archived',
                      ) => setState((prev) => ({ ...prev, status: value }))}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        className={cn(getTouchOptimizedClasses(), 'text-base')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mobile Optimization Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mobile_optimized"
                    checked={state.mobile_optimized}
                    onCheckedChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        mobile_optimized: checked,
                      }))
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="mobile_optimized">Mobile Optimized</Label>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={state.content}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Enter your content here..."
                    disabled={disabled}
                    rows={viewMode === 'mobile' ? 10 : 15}
                    className={cn(
                      getTouchOptimizedClasses(),
                      'text-base resize-none',
                    )}
                  />
                  <div className="text-xs text-muted-foreground">
                    {state.content.length} characters
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                      disabled={disabled}
                      className={cn(getTouchOptimizedClasses(), 'text-base')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput.trim());
                        }
                      }}
                    />
                    <Button
                      onClick={() => addTag(tagInput.trim())}
                      disabled={disabled || !tagInput.trim()}
                      className={getTouchOptimizedClasses()}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {state.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                      >
                        {tag}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-auto p-0 text-xs"
                          onClick={() => removeTag(tag)}
                          disabled={disabled}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">SEO Optimization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Meta Title */}
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={state.meta_title}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        meta_title: e.target.value,
                      }))
                    }
                    placeholder="SEO-optimized title (60 characters max)"
                    disabled={disabled}
                    maxLength={60}
                    className={cn(getTouchOptimizedClasses(), 'text-base')}
                  />
                  <div className="text-xs text-muted-foreground">
                    {state.meta_title.length}/60 characters
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={state.meta_description}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        meta_description: e.target.value,
                      }))
                    }
                    placeholder="Brief description for search engines (160 characters max)"
                    disabled={disabled}
                    maxLength={160}
                    rows={3}
                    className={cn(
                      getTouchOptimizedClasses(),
                      'text-base resize-none',
                    )}
                  />
                  <div className="text-xs text-muted-foreground">
                    {state.meta_description.length}/160 characters
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mobile Score */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Mobile Score</Label>
                    <span className="text-sm font-medium">
                      {performance.mobileScore}/100
                    </span>
                  </div>
                  <Progress value={performance.mobileScore} className="h-2" />
                </div>

                {/* Edit Time */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Edit Time</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(performance.editTime / 1000)}s
                    </span>
                  </div>
                </div>

                {/* Save Performance */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Last Save Time</Label>
                    <span className="text-sm text-muted-foreground">
                      {performance.saveTime}ms
                    </span>
                  </div>
                </div>

                {/* Performance Mode */}
                <div className="space-y-2">
                  <Label>Performance Mode</Label>
                  <Select
                    value={performanceMode}
                    onValueChange={(value) => {
                      // This would typically be handled by parent component
                      toast.info(`Performance mode: ${value}`);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      className={cn(getTouchOptimizedClasses(), 'text-base')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">
                        Fast (Lower quality, faster saves)
                      </SelectItem>
                      <SelectItem value="balanced">
                        Balanced (Optimal performance)
                      </SelectItem>
                      <SelectItem value="quality">
                        Quality (Best output, slower saves)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
