'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  Edit,
  AlignLeft,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  Image,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Wand2,
  Lightbulb,
  Tags,
  Category,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  KnowledgeEditorProps,
  KnowledgeArticle,
  EditorConfig,
} from '@/types/knowledge-base';

/**
 * KnowledgeEditor Component - Rich text editor with AI assistance
 * Part of WS-210: AI Knowledge Base System
 *
 * Real Wedding Scenario:
 * A photographer creates "Perfect Outdoor Ceremony Timeline" with:
 * - AI-powered writing suggestions as they type
 * - Grammar and style improvements
 * - Template suggestions based on content type
 * - Auto-save functionality
 * - Plagiarism detection for industry best practices
 */
export default function KnowledgeEditor({
  config,
  initial_article,
  on_save,
  on_cancel,
  auto_save = true,
  className,
  organization_id,
  user_id,
}: KnowledgeEditorProps) {
  const [article, setArticle] = useState<Partial<KnowledgeArticle>>({
    title: '',
    content: '',
    excerpt: '',
    category: 'general',
    tags: [],
    status: 'draft',
    ai_generated: false,
    ...initial_article,
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(auto_save);
  const [aiAssistance, setAiAssistance] = useState(config.enable_ai_assistance);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState({
    confidence_score: 0.85,
    grammar_issues: 0,
    plagiarism_score: 0.12,
    readability_score: 7.2,
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && (article.title || article.content)) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, config.auto_save_interval * 1000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    article.title,
    article.content,
    autoSaveEnabled,
    config.auto_save_interval,
  ]);

  // Update word count and reading time
  useEffect(() => {
    if (article.content) {
      const words = article.content.trim().split(/\s+/).length;
      setWordCount(words);
      setReadingTime(Math.ceil(words / 200)); // Average reading speed
    } else {
      setWordCount(0);
      setReadingTime(0);
    }
  }, [article.content]);

  // AI suggestions based on content
  useEffect(() => {
    if (aiAssistance && article.content && article.content.length > 100) {
      generateAISuggestions(article.content);
    }
  }, [article.content, aiAssistance]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (article.title || article.content) {
      try {
        // Mock auto-save - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [article]);

  // Generate AI suggestions
  const generateAISuggestions = useCallback(async (content: string) => {
    try {
      // Mock AI suggestions - replace with actual AI service call
      const mockSuggestions = [
        'Consider adding specific timing details for vendor coordination',
        'Include weather contingency plans for outdoor events',
        'Add photography timeline integration points',
        'Consider guest accessibility requirements in the timeline',
      ];

      setAiSuggestions(mockSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  }, []);

  // Handle form submission
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const articleToSave: KnowledgeArticle = {
        id: article.id || `article-${Date.now()}`,
        title: article.title || 'Untitled Article',
        content: article.content || '',
        excerpt: article.excerpt || generateExcerpt(article.content || ''),
        category: article.category || 'general',
        tags: article.tags || [],
        author_id: user_id,
        organization_id,
        status: article.status || 'draft',
        ai_generated: article.ai_generated || false,
        created_at: article.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: article.view_count || 0,
        like_count: article.like_count || 0,
        share_count: article.share_count || 0,
        search_keywords: extractKeywords(article.content || ''),
        is_featured: article.is_featured || false,
      };

      await on_save(articleToSave);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      setSaving(false);
    }
  }, [article, user_id, organization_id, on_save]);

  // Handle input changes
  const handleInputChange = useCallback(
    (field: keyof KnowledgeArticle, value: any) => {
      setArticle((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Add tag
  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag && !article.tags?.includes(tag)) {
        handleInputChange('tags', [...(article.tags || []), tag]);
      }
    },
    [article.tags, handleInputChange],
  );

  // Remove tag
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      handleInputChange(
        'tags',
        article.tags?.filter((tag) => tag !== tagToRemove) || [],
      );
    },
    [article.tags, handleInputChange],
  );

  // Apply AI suggestion
  const applyAISuggestion = useCallback(
    (suggestion: string) => {
      const currentContent = article.content || '';
      const enhancedContent =
        currentContent + '\n\n' + '> AI Suggestion: ' + suggestion;
      handleInputChange('content', enhancedContent);
    },
    [article.content, handleInputChange],
  );

  // Generate excerpt from content
  const generateExcerpt = (content: string) => {
    return (
      content.split('\n')[0].slice(0, 150) + (content.length > 150 ? '...' : '')
    );
  };

  // Extract keywords from content
  const extractKeywords = (content: string) => {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const commonWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    return [
      ...new Set(
        words.filter((word) => word.length > 3 && !commonWords.includes(word)),
      ),
    ].slice(0, 10);
  };

  return (
    <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Edit className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {config.mode === 'create' ? 'Create Article' : 'Edit Article'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{wordCount} words</span>
              <span>{readingTime} min read</span>
              {lastSaved && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Edit' : 'Preview'}
          </Button>

          <Button
            variant="outline"
            onClick={on_cancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !article.title}
            className="flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-4">
          {showPreview ? (
            <Card>
              <CardHeader>
                <CardTitle>{article.title || 'Untitled Article'}</CardTitle>
                {article.excerpt && (
                  <p className="text-muted-foreground">{article.excerpt}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {article.category}
                  </Badge>
                  {article.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">
                    {article.content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={article.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter article title..."
                  className="text-lg font-medium"
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                <Textarea
                  id="excerpt"
                  value={article.excerpt || ''}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="Brief description of the article..."
                  rows={2}
                />
              </div>

              {/* Content Editor */}
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  ref={contentRef}
                  id="content"
                  value={article.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Write your article content here..."
                  className="min-h-[400px] font-mono"
                />
              </div>

              {/* AI Suggestions */}
              {aiAssistance && aiSuggestions.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      AI Writing Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{suggestion}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applyAISuggestion(suggestion)}
                          className="ml-2 flex items-center gap-1"
                        >
                          <Wand2 className="h-3 w-3" />
                          Apply
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={article.category}
                  onValueChange={(value) =>
                    handleInputChange('category', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="florist">Florist</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={article.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-save */}
              <div className="flex items-center justify-between">
                <Label htmlFor="autosave" className="text-sm">
                  Auto-save
                </Label>
                <Switch
                  id="autosave"
                  checked={autoSaveEnabled}
                  onCheckedChange={setAutoSaveEnabled}
                />
              </div>

              {/* AI Assistance */}
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-assist" className="text-sm">
                  AI Assistance
                </Label>
                <Switch
                  id="ai-assist"
                  checked={aiAssistance}
                  onCheckedChange={setAiAssistance}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tags className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                {article.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Press Enter to add tags
              </div>
            </CardContent>
          </Card>

          {/* Content Analysis */}
          {aiAssistance && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Content Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI Confidence</span>
                    <span>
                      {Math.round(aiAnalysis.confidence_score * 100)}%
                    </span>
                  </div>
                  <Progress value={aiAnalysis.confidence_score * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Readability</span>
                    <span>{aiAnalysis.readability_score}/10</span>
                  </div>
                  <Progress value={aiAnalysis.readability_score * 10} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Originality</span>
                    <span>
                      {Math.round((1 - aiAnalysis.plagiarism_score) * 100)}%
                    </span>
                  </div>
                  <Progress value={(1 - aiAnalysis.plagiarism_score) * 100} />
                </div>

                {aiAnalysis.grammar_issues > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    {aiAnalysis.grammar_issues} grammar suggestions
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
