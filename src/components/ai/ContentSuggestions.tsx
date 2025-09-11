'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Plus,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
  Users,
  BookOpen,
  Zap,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ContentSuggestionsProps,
  ContentSuggestion,
  KnowledgeArticle,
} from '@/types/knowledge-base';

/**
 * ContentSuggestions Component - AI-generated content recommendations
 * Part of WS-210: AI Knowledge Base System
 *
 * Real Wedding Scenario:
 * When viewing "timeline for outdoor ceremony" article, AI suggests:
 * - Adding venue-specific timing considerations
 * - Creating related articles about weather contingencies
 * - Improving existing content with vendor coordination tips
 * - Trending topics to cover based on user queries
 */
export default function ContentSuggestions({
  organization_id,
  current_article_id,
  suggestion_types = ['improvement', 'addition', 'related', 'trending'],
  max_suggestions = 8,
  onSuggestionAccept,
  onSuggestionReject,
  className,
}: ContentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Mock suggestions data - replace with actual API calls
  const mockSuggestions: ContentSuggestion[] = [
    {
      id: 'sug-1',
      type: 'improvement',
      title: 'Add Weather Contingency Section',
      description:
        'Your outdoor ceremony timeline would benefit from detailed weather backup plans.',
      suggested_content: `## Weather Contingency Planning

### 60 Minutes Before Ceremony
- Check weather conditions and make final venue decision
- Communicate any changes to all vendors immediately
- Ensure backup seating and sound equipment is ready

### Indoor Backup Timeline
- Adjust setup timeline by 30 minutes for indoor transition
- Coordinate with venue staff for quick room flip
- Update photography locations and shot list

### Communication Protocol
- Designate one person to coordinate all vendor communications
- Prepare templates for quick guest notifications
- Have backup contact methods for key vendors`,
      category: 'timeline',
      confidence_score: 0.92,
      based_on: ['timeline-analysis', 'weather-patterns', 'vendor-feedback'],
      created_at: '2024-01-20T10:30:00Z',
      status: 'pending',
    },
    {
      id: 'sug-2',
      type: 'addition',
      title: 'Create "Vendor Arrival Coordination" Article',
      description:
        "Based on user searches, there's high demand for vendor coordination guides.",
      suggested_content: `# Vendor Arrival Coordination Guide

## Pre-Event Vendor Schedule

### Photography Team
- Arrive 2 hours before ceremony
- Setup time: 30 minutes
- Location scouting: 15 minutes

### Catering Team
- Arrive 3 hours before reception
- Kitchen setup: 1 hour
- Final prep: 30 minutes before service

### Music/DJ Setup
- Arrive 1.5 hours before ceremony
- Sound check during cocktail setup
- Equipment testing: 20 minutes

## Communication Best Practices
- Send final timeline 48 hours before event
- Create vendor WhatsApp group for day-of coordination
- Assign timeline manager for vendor check-ins`,
      category: 'general',
      confidence_score: 0.87,
      based_on: ['search-trends', 'user-requests', 'industry-gaps'],
      created_at: '2024-01-20T11:15:00Z',
      status: 'pending',
    },
    {
      id: 'sug-3',
      type: 'related',
      title: 'Link to "Photography Timeline Templates"',
      description:
        'Users reading timeline articles often need photography-specific schedules.',
      suggested_content: `**Related Article Suggestion:**
Add cross-references to photography timeline templates that complement your ceremony timeline.

**Suggested Links:**
- "Golden Hour Photography Schedule"
- "Family Photo Coordination Timeline"  
- "Reception Photography Checklist"

**Integration Points:**
- Add photography timing notes in ceremony timeline
- Include photographer arrival in vendor coordination
- Cross-link related photography articles`,
      category: 'photography',
      confidence_score: 0.78,
      based_on: ['user-behavior', 'cross-references', 'content-gaps'],
      created_at: '2024-01-20T12:00:00Z',
      status: 'pending',
    },
    {
      id: 'sug-4',
      type: 'trending',
      title: 'Add Sustainable Wedding Practices',
      description:
        'Trending topic: 45% growth in searches for eco-friendly wedding planning.',
      suggested_content: `## Sustainable Timeline Considerations

### Eco-Friendly Vendor Selection
- Priority booking for local vendors (reduces transport emissions)
- Digital-first communication and contracts
- Vendors with sustainable practices certifications

### Waste Reduction Timeline
- Plan 15 extra minutes for proper recycling setup
- Coordinate with caterers on compostable serviceware timing
- Schedule post-event donation pickups during breakdown

### Digital Solutions
- QR codes for programs and menus (print 30 minutes before ceremony)
- Digital guest book setup timing
- Social media live streaming coordination`,
      category: 'general',
      confidence_score: 0.83,
      based_on: ['trend-analysis', 'search-growth', 'industry-reports'],
      created_at: '2024-01-20T09:45:00Z',
      status: 'pending',
    },
  ];

  // Load suggestions on component mount
  useEffect(() => {
    loadSuggestions();
  }, [organization_id, current_article_id]);

  // Load suggestions from API
  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const filteredSuggestions = mockSuggestions
        .filter((s) => suggestion_types.includes(s.type))
        .slice(0, max_suggestions);

      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [organization_id, current_article_id, suggestion_types, max_suggestions]);

  // Handle suggestion acceptance
  const handleAcceptSuggestion = useCallback(
    async (suggestion: ContentSuggestion) => {
      setProcessingId(suggestion.id);
      try {
        await onSuggestionAccept(suggestion);

        // Update local state
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestion.id ? { ...s, status: 'accepted' } : s,
          ),
        );
      } catch (error) {
        console.error('Error accepting suggestion:', error);
      } finally {
        setProcessingId(null);
      }
    },
    [onSuggestionAccept],
  );

  // Handle suggestion rejection
  const handleRejectSuggestion = useCallback(
    async (suggestion_id: string) => {
      setProcessingId(suggestion_id);
      try {
        await onSuggestionReject(suggestion_id);

        // Remove from local state
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion_id));
      } catch (error) {
        console.error('Error rejecting suggestion:', error);
      } finally {
        setProcessingId(null);
      }
    },
    [onSuggestionReject],
  );

  // Get suggestion icon based on type
  const getSuggestionIcon = (type: ContentSuggestion['type']) => {
    switch (type) {
      case 'improvement':
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'addition':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'related':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-orange-600" />;
    }
  };

  // Get suggestion color based on type
  const getSuggestionColor = (type: ContentSuggestion['type']) => {
    switch (type) {
      case 'improvement':
        return 'border-yellow-200 bg-yellow-50';
      case 'addition':
        return 'border-green-200 bg-green-50';
      case 'related':
        return 'border-blue-200 bg-blue-50';
      case 'trending':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-orange-200 bg-orange-50';
    }
  };

  // Group suggestions by type
  const suggestionsByType = suggestions.reduce(
    (acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    },
    {} as Record<ContentSuggestion['type'], ContentSuggestion[]>,
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Lightbulb className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Content Suggestions</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered recommendations to improve your knowledge base
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadSuggestions}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Suggestions */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All ({suggestions.length})</TabsTrigger>
            <TabsTrigger value="improvement">
              Improve ({suggestionsByType.improvement?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="addition">
              Add ({suggestionsByType.addition?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="related">
              Link ({suggestionsByType.related?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="trending">
              Trending ({suggestionsByType.trending?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => handleAcceptSuggestion(suggestion)}
                onReject={() => handleRejectSuggestion(suggestion.id)}
                isProcessing={processingId === suggestion.id}
                getSuggestionIcon={getSuggestionIcon}
                getSuggestionColor={getSuggestionColor}
              />
            ))}
          </TabsContent>

          {Object.entries(suggestionsByType).map(([type, typeSuggestions]) => (
            <TabsContent key={type} value={type} className="space-y-3">
              {typeSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAcceptSuggestion(suggestion)}
                  onReject={() => handleRejectSuggestion(suggestion.id)}
                  isProcessing={processingId === suggestion.id}
                  getSuggestionIcon={getSuggestionIcon}
                  getSuggestionColor={getSuggestionColor}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No Suggestions Available
            </h3>
            <p className="text-muted-foreground mb-4">
              AI is analyzing your content to provide personalized
              recommendations
            </p>
            <Button onClick={loadSuggestions} disabled={loading}>
              <RefreshCw
                className={cn('h-4 w-4 mr-2', loading && 'animate-spin')}
              />
              Check for Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual suggestion card component
interface SuggestionCardProps {
  suggestion: ContentSuggestion;
  onAccept: () => void;
  onReject: () => void;
  isProcessing: boolean;
  getSuggestionIcon: (type: ContentSuggestion['type']) => React.ReactNode;
  getSuggestionColor: (type: ContentSuggestion['type']) => string;
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  isProcessing,
  getSuggestionIcon,
  getSuggestionColor,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        getSuggestionColor(suggestion.type),
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getSuggestionIcon(suggestion.type)}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1">
                {suggestion.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {suggestion.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <Badge variant="outline" className="text-xs capitalize">
              {suggestion.type}
            </Badge>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              {Math.round(suggestion.confidence_score * 100)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Expandable Content Preview */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 mr-1 transition-transform',
                isExpanded && 'transform rotate-90',
              )}
            />
            {isExpanded ? 'Hide' : 'Show'} suggested content
          </Button>

          {isExpanded && (
            <div className="mt-3 p-3 bg-white/50 rounded-md border">
              <ScrollArea className="h-32">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {suggestion.suggested_content}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <Separator className="mb-4" />

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(suggestion.created_at).toLocaleDateString()}
            </div>
            <Badge variant="secondary" className="capitalize text-xs">
              {suggestion.category}
            </Badge>
          </div>

          <div className="text-xs">
            Based on: {suggestion.based_on.join(', ')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Accept
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <X className="h-3 w-3" />
            Reject
          </Button>

          <div className="flex-1" />

          {/* Confidence Score */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Confidence:</span>
            <Progress
              value={suggestion.confidence_score * 100}
              className="w-16 h-1"
            />
            <span>{Math.round(suggestion.confidence_score * 100)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
