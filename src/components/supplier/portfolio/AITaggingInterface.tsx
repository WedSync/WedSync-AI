'use client';

// WS-186: Smart tagging and categorization interface with AI suggestions

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Tag,
  Check,
  X,
  Plus,
  Edit3,
  Brain,
  Target,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { GalleryImage, TagSuggestion } from '@/types/portfolio';

interface AITaggingInterfaceProps {
  images: GalleryImage[];
  aiSuggestions: TagSuggestion[];
  onTagsUpdate: (imageId: string, tags: string[]) => void;
  onCategoryUpdate: (imageId: string, category: string) => void;
  onClose?: () => void;
}

interface ProcessingState {
  imageId: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number;
  suggestions?: TagSuggestion[];
  error?: string;
}

const WEDDING_CATEGORIES = [
  { id: 'ceremony', name: 'Ceremony', color: 'bg-pink-500' },
  { id: 'reception', name: 'Reception', color: 'bg-purple-500' },
  { id: 'portraits', name: 'Portraits', color: 'bg-blue-500' },
  { id: 'details', name: 'Details', color: 'bg-green-500' },
  { id: 'getting-ready', name: 'Getting Ready', color: 'bg-yellow-500' },
  { id: 'family', name: 'Family Photos', color: 'bg-indigo-500' },
  { id: 'candid', name: 'Candid Moments', color: 'bg-red-500' },
  { id: 'venue', name: 'Venue', color: 'bg-gray-500' },
];

export function AITaggingInterface({
  images,
  aiSuggestions,
  onTagsUpdate,
  onCategoryUpdate,
  onClose,
}: AITaggingInterfaceProps) {
  const [processingStates, setProcessingStates] = useState<
    Map<string, ProcessingState>
  >(new Map());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(0.8);
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize processing states
  useEffect(() => {
    const initialStates = new Map<string, ProcessingState>();
    images.forEach((image) => {
      initialStates.set(image.id, {
        imageId: image.id,
        status: 'pending',
        progress: 0,
      });
    });
    setProcessingStates(initialStates);
  }, [images]);

  // Start AI analysis for all images
  const startAIAnalysis = async () => {
    setIsProcessing(true);

    try {
      // Process images in batches of 3 for optimal performance
      const batchSize = 3;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (image) => {
            await analyzeImage(image);
          }),
        );
      }
    } catch (error) {
      console.error('Batch AI analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Analyze single image with AI
  const analyzeImage = async (image: GalleryImage) => {
    const updateState = (updates: Partial<ProcessingState>) => {
      setProcessingStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(image.id);
        if (currentState) {
          newStates.set(image.id, { ...currentState, ...updates });
        }
        return newStates;
      });
    };

    try {
      updateState({ status: 'analyzing', progress: 20 });

      const response = await fetch('/api/portfolio/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: image.id,
          imageUrl: image.optimized_url || image.original_url,
        }),
      });

      updateState({ progress: 60 });

      if (!response.ok) throw new Error('AI analysis failed');

      const result = await response.json();

      updateState({ progress: 90 });

      // Process AI suggestions
      const suggestions: TagSuggestion[] = result.tags.map((tag: any) => ({
        tag: tag.name,
        confidence: tag.confidence,
        category: tag.category || 'general',
        source: 'ai',
      }));

      // Auto-apply high-confidence tags
      const highConfidenceTags = suggestions
        .filter((s) => s.confidence >= autoApplyThreshold)
        .map((s) => s.tag);

      if (highConfidenceTags.length > 0) {
        onTagsUpdate(image.id, [
          ...(image.manual_tags || []),
          ...highConfidenceTags,
        ]);
      }

      // Auto-categorize if high confidence
      if (result.category && result.categoryConfidence >= autoApplyThreshold) {
        onCategoryUpdate(image.id, result.category);
      }

      updateState({
        status: 'completed',
        progress: 100,
        suggestions,
      });
    } catch (error: any) {
      updateState({
        status: 'error',
        error: error.message,
      });
    }
  };

  // Handle tag suggestion acceptance
  const acceptSuggestion = (imageId: string, suggestion: TagSuggestion) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    const currentTags = image.manual_tags || [];
    if (!currentTags.includes(suggestion.tag)) {
      onTagsUpdate(imageId, [...currentTags, suggestion.tag]);
    }

    // Remove suggestion from state
    setProcessingStates((prev) => {
      const newStates = new Map(prev);
      const state = newStates.get(imageId);
      if (state?.suggestions) {
        state.suggestions = state.suggestions.filter(
          (s) => s.tag !== suggestion.tag,
        );
      }
      return newStates;
    });
  };

  // Handle tag suggestion rejection
  const rejectSuggestion = (imageId: string, suggestion: TagSuggestion) => {
    setProcessingStates((prev) => {
      const newStates = new Map(prev);
      const state = newStates.get(imageId);
      if (state?.suggestions) {
        state.suggestions = state.suggestions.filter(
          (s) => s.tag !== suggestion.tag,
        );
      }
      return newStates;
    });
  };

  // Batch operations
  const applyBatchTags = (tags: string[]) => {
    selectedImages.forEach((imageId) => {
      const image = images.find((img) => img.id === imageId);
      if (image) {
        const currentTags = image.manual_tags || [];
        const newTags = [...new Set([...currentTags, ...tags])];
        onTagsUpdate(imageId, newTags);
      }
    });
  };

  const applyBatchCategory = (category: string) => {
    selectedImages.forEach((imageId) => {
      onCategoryUpdate(imageId, category);
    });
  };

  // Filter images
  const filteredImages = images.filter((image) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        image.title?.toLowerCase().includes(searchLower) ||
        image.alt_text?.toLowerCase().includes(searchLower) ||
        (image.ai_tags || []).some((tag) =>
          tag.toLowerCase().includes(searchLower),
        ) ||
        (image.manual_tags || []).some((tag) =>
          tag.toLowerCase().includes(searchLower),
        );

      if (!matchesSearch) return false;
    }

    if (selectedCategory !== 'all' && image.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Get overall progress
  const overallProgress = () => {
    const states = Array.from(processingStates.values());
    if (states.length === 0) return 0;

    const totalProgress = states.reduce(
      (sum, state) => sum + state.progress,
      0,
    );
    return Math.round(totalProgress / states.length);
  };

  const completedCount = Array.from(processingStates.values()).filter(
    (s) => s.status === 'completed',
  ).length;
  const errorCount = Array.from(processingStates.values()).filter(
    (s) => s.status === 'error',
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  AI Tagging Interface
                </h2>
                <p className="text-gray-600">
                  Smart categorization and tagging for {images.length} images
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
              <Brain className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>

            <Button
              variant="primary"
              leftIcon={<Wand2 className="w-4 h-4" />}
              onClick={startAIAnalysis}
              disabled={isProcessing}
            >
              {isProcessing ? 'Analyzing...' : 'Start AI Analysis'}
            </Button>

            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        {isProcessing && (
          <div className="p-6 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-purple-900">
                AI Analysis Progress
              </h3>
              <span className="text-sm text-purple-700">
                {completedCount}/{images.length} completed
              </span>
            </div>

            <Progress value={overallProgress()} className="h-2 mb-3" />

            <div className="flex items-center gap-6 text-sm">
              <div className="text-green-600">✓ {completedCount} completed</div>
              {errorCount > 0 && (
                <div className="text-red-600">✗ {errorCount} failed</div>
              )}
              <div className="text-purple-600">
                🧠 Auto-apply threshold: {Math.round(autoApplyThreshold * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search images to tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {WEDDING_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? 'primary' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${category.color}`}
                  />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Batch Operations */}
          {selectedImages.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-blue-900">
                    {selectedImages.size} images selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedImages(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>

                <div className="flex gap-2">
                  <BatchTagModal
                    selectedCount={selectedImages.size}
                    onApply={applyBatchTags}
                  />

                  <BatchCategoryModal
                    selectedCount={selectedImages.size}
                    categories={WEDDING_CATEGORIES}
                    onApply={applyBatchCategory}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Images Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredImages.map((image) => {
              const processingState = processingStates.get(image.id);
              const isExpanded = expandedImages.has(image.id);

              return (
                <ImageTaggingCard
                  key={image.id}
                  image={image}
                  processingState={processingState}
                  isExpanded={isExpanded}
                  isSelected={selectedImages.has(image.id)}
                  onToggleExpanded={() => {
                    setExpandedImages((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(image.id)) {
                        newSet.delete(image.id);
                      } else {
                        newSet.add(image.id);
                      }
                      return newSet;
                    });
                  }}
                  onToggleSelected={() => {
                    setSelectedImages((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(image.id)) {
                        newSet.delete(image.id);
                      } else {
                        newSet.add(image.id);
                      }
                      return newSet;
                    });
                  }}
                  onAcceptSuggestion={(suggestion) =>
                    acceptSuggestion(image.id, suggestion)
                  }
                  onRejectSuggestion={(suggestion) =>
                    rejectSuggestion(image.id, suggestion)
                  }
                  onRetryAnalysis={() => analyzeImage(image)}
                  categories={WEDDING_CATEGORIES}
                  onCategoryUpdate={(category) =>
                    onCategoryUpdate(image.id, category)
                  }
                  onTagsUpdate={(tags) => onTagsUpdate(image.id, tags)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual image tagging card
interface ImageTaggingCardProps {
  image: GalleryImage;
  processingState?: ProcessingState;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpanded: () => void;
  onToggleSelected: () => void;
  onAcceptSuggestion: (suggestion: TagSuggestion) => void;
  onRejectSuggestion: (suggestion: TagSuggestion) => void;
  onRetryAnalysis: () => void;
  categories: Array<{ id: string; name: string; color: string }>;
  onCategoryUpdate: (category: string) => void;
  onTagsUpdate: (tags: string[]) => void;
}

function ImageTaggingCard({
  image,
  processingState,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onToggleSelected,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRetryAnalysis,
  categories,
  onCategoryUpdate,
  onTagsUpdate,
}: ImageTaggingCardProps) {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const currentTags = image.manual_tags || [];
    if (!currentTags.includes(newTag.trim())) {
      onTagsUpdate([...currentTags, newTag.trim()]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = image.manual_tags || [];
    onTagsUpdate(currentTags.filter((tag) => tag !== tagToRemove));
  };

  const getStatusIcon = () => {
    switch (processingState?.status) {
      case 'analyzing':
        return <Brain className="w-4 h-4 text-purple-500 animate-pulse" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div
      className={`
      border rounded-lg overflow-hidden transition-all duration-200
      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
    `}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelected}
            className="w-4 h-4 mt-1 text-blue-600 rounded border-gray-300"
          />

          <img
            src={image.thumbnail_url}
            alt={image.alt_text || image.title}
            className="w-16 h-16 object-cover rounded-lg"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 truncate">
                {image.title || 'Untitled'}
              </h4>

              <div className="flex items-center gap-2">
                {getStatusIcon()}

                <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Current Category */}
            <div className="mt-2">
              <span className="text-sm text-gray-600">Category: </span>
              {image.category ? (
                <Badge variant="outline" className="text-xs">
                  {categories.find((c) => c.id === image.category)?.name ||
                    image.category}
                </Badge>
              ) : (
                <span className="text-sm text-gray-400">Uncategorized</span>
              )}
            </div>

            {/* Current Tags */}
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {(image.manual_tags || []).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Processing Progress */}
            {processingState?.status === 'analyzing' && (
              <div className="mt-2">
                <Progress value={processingState.progress} className="h-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* AI Suggestions */}
          {processingState?.suggestions &&
            processingState.suggestions.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  AI Suggestions
                </h5>

                <div className="space-y-2">
                  {processingState.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            suggestion.confidence >= 0.8
                              ? 'border-green-300 text-green-700'
                              : suggestion.confidence >= 0.6
                                ? 'border-yellow-300 text-yellow-700'
                                : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {suggestion.tag}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAcceptSuggestion(suggestion)}
                        >
                          <Check className="w-3 h-3 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRejectSuggestion(suggestion)}
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Manual Tag Addition */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Add Custom Tags</h5>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Category</h5>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    image.category === category.id ? 'primary' : 'secondary'
                  }
                  size="sm"
                  onClick={() => onCategoryUpdate(category.id)}
                  className="justify-start text-xs"
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${category.color}`}
                  />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Handling */}
          {processingState?.status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">
                    {processingState.error || 'Analysis failed'}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={onRetryAnalysis}>
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Batch tagging modal placeholder
function BatchTagModal({
  selectedCount,
  onApply,
}: {
  selectedCount: number;
  onApply: (tags: string[]) => void;
}) {
  return (
    <Button variant="secondary" size="sm">
      <Tag className="w-4 h-4 mr-1" />
      Batch Tag ({selectedCount})
    </Button>
  );
}

// Batch category modal placeholder
function BatchCategoryModal({
  selectedCount,
  categories,
  onApply,
}: {
  selectedCount: number;
  categories: Array<{ id: string; name: string; color: string }>;
  onApply: (category: string) => void;
}) {
  return (
    <Button variant="secondary" size="sm">
      <Target className="w-4 h-4 mr-1" />
      Batch Categorize ({selectedCount})
    </Button>
  );
}
