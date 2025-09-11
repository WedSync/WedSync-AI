'use client';

import { useState, useMemo } from 'react';
import {
  Zap,
  Clock,
  MessageSquare,
  Repeat,
  Mail,
  User,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Filter,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  OptimizationSuggestionsProps,
  OptimizationSuggestion,
} from '@/types/journey-ai';

const SUGGESTION_TYPE_ICONS = {
  timing: Clock,
  content: MessageSquare,
  frequency: Repeat,
  channel: Mail,
  personalization: User,
} as const;

const SUGGESTION_TYPE_COLORS = {
  timing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  content: 'bg-green-500/10 text-green-600 border-green-500/20',
  frequency: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  channel: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  personalization: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
} as const;

const PRIORITY_COLORS = {
  critical: 'border-l-danger bg-danger/5',
  high: 'border-l-warning bg-warning/5',
  medium: 'border-l-accent bg-accent/5',
  low: 'border-l-muted-foreground bg-muted/5',
} as const;

const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Moderate',
  hard: 'Complex',
} as const;

const DIFFICULTY_COLORS = {
  easy: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  hard: 'bg-danger/10 text-danger',
} as const;

interface OptimizationCardProps {
  suggestion: OptimizationSuggestion;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelection: () => void;
  onToggleExpansion: () => void;
  onApply: () => void;
  onDismiss: () => void;
  applicableNodes: string[];
}

function OptimizationCard({
  suggestion,
  isSelected,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  onApply,
  onDismiss,
  applicableNodes,
}: OptimizationCardProps) {
  const Icon = SUGGESTION_TYPE_ICONS[suggestion.type];

  return (
    <div
      className={`rounded-lg border-l-4 bg-background transition-all hover:shadow-sm ${
        PRIORITY_COLORS[suggestion.priority]
      } ${isSelected ? 'ring-2 ring-accent/20' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Selection checkbox */}
            <button
              onClick={onToggleSelection}
              className={`mt-0.5 rounded border-2 p-0.5 transition-colors ${
                isSelected
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
            </button>

            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-center space-x-2">
                <div
                  className={`rounded-lg border p-1.5 ${SUGGESTION_TYPE_COLORS[suggestion.type]}`}
                >
                  <Icon className="h-3 w-3" />
                </div>

                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">
                    {suggestion.title}
                  </h4>
                  <div className="flex items-center space-x-3 mt-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        suggestion.priority === 'critical'
                          ? 'bg-danger/10 text-danger'
                          : suggestion.priority === 'high'
                            ? 'bg-warning/10 text-warning'
                            : suggestion.priority === 'medium'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {suggestion.priority} priority
                    </span>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        DIFFICULTY_COLORS[suggestion.implementation.difficulty]
                      }`}
                    >
                      {DIFFICULTY_LABELS[suggestion.implementation.difficulty]}
                    </span>

                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>
                        +{suggestion.expectedImprovement.increase}%{' '}
                        {suggestion.expectedImprovement.metric}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onToggleExpansion}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                {suggestion.description}
              </p>

              {/* Expanded content */}
              {isExpanded && (
                <div className="space-y-3 pt-2 border-t border-border">
                  {/* AI Reasoning */}
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      AI Reasoning
                    </h5>
                    <p className="text-sm text-foreground">
                      {suggestion.reasoning}
                    </p>
                  </div>

                  {/* Implementation steps */}
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Implementation Steps
                    </h5>
                    <ul className="space-y-1">
                      {suggestion.implementation.steps.map((step, index) => (
                        <li
                          key={index}
                          className="flex items-start space-x-2 text-sm"
                        >
                          <span className="rounded-full bg-accent/20 text-accent text-xs h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-foreground">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Applicable nodes */}
                  {applicableNodes.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Affects {applicableNodes.length} Journey Steps
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {applicableNodes.slice(0, 3).map((nodeId) => (
                          <span
                            key={nodeId}
                            className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            {nodeId}
                          </span>
                        ))}
                        {applicableNodes.length > 3 && (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            +{applicableNodes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Implementation time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Estimated time: {suggestion.implementation.timeRequired}{' '}
                        minutes
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={onApply}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Apply
            </button>
            <button
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OptimizationSuggestions({
  suggestions,
  selectedSuggestions,
  onToggleSelection,
  onApplySuggestion,
  onDismissSuggestion,
  journey,
}: OptimizationSuggestionsProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'critical' | 'easy'>(
    'all',
  );
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((suggestion) => {
      switch (filter) {
        case 'high':
          return (
            suggestion.priority === 'high' || suggestion.priority === 'critical'
          );
        case 'critical':
          return suggestion.priority === 'critical';
        case 'easy':
          return suggestion.implementation.difficulty === 'easy';
        default:
          return true;
      }
    });
  }, [suggestions, filter]);

  const sortedSuggestions = useMemo(() => {
    return [...filteredSuggestions].sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by expected improvement
      return b.expectedImprovement.increase - a.expectedImprovement.increase;
    });
  }, [filteredSuggestions]);

  const totalImprovementPotential = useMemo(() => {
    return suggestions
      .filter((s) => selectedSuggestions.includes(s.id))
      .reduce((sum, s) => sum + s.expectedImprovement.increase, 0);
  }, [suggestions, selectedSuggestions]);

  const toggleExpansion = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const applyAllSelected = () => {
    selectedSuggestions.forEach((suggestionId) => {
      onApplySuggestion(suggestionId);
    });
  };

  const getApplicableNodeNames = (suggestion: OptimizationSuggestion) => {
    if (!suggestion.applicableToNodes) return [];

    return suggestion.applicableToNodes
      .map((nodeId) => {
        const node = journey.journey.nodes.find((n) => n.id === nodeId);
        return node?.data.title || nodeId;
      })
      .filter(Boolean);
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="rounded-full bg-muted/50 h-16 w-16 mx-auto mb-4 flex items-center justify-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">
          No Optimization Suggestions
        </h3>
        <p className="text-sm text-muted-foreground">
          Your journey is already well-optimized! Check back after making
          changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <div>
            <h3 className="font-semibold text-foreground">
              Optimization Suggestions
            </h3>
            <p className="text-sm text-muted-foreground">
              AI-powered recommendations to improve your journey performance
            </p>
          </div>
        </div>

        {selectedSuggestions.length > 0 && (
          <div className="flex items-center space-x-3">
            <div className="text-sm text-muted-foreground">
              {selectedSuggestions.length} selected • +
              {totalImprovementPotential.toFixed(1)}% potential improvement
            </div>
            <button
              onClick={applyAllSelected}
              className="flex items-center space-x-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              <Zap className="h-4 w-4" />
              <span>Apply Selected ({selectedSuggestions.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-muted-foreground">
              Total Suggestions
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {suggestions.length}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-danger" />
            <span className="text-sm font-medium text-muted-foreground">
              Critical Priority
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {suggestions.filter((s) => s.priority === 'critical').length}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-muted-foreground">
              Easy to Implement
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {
              suggestions.filter((s) => s.implementation.difficulty === 'easy')
                .length
            }
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-muted-foreground">
              Avg Improvement
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            +
            {(
              suggestions.reduce(
                (sum, s) => sum + s.expectedImprovement.increase,
                0,
              ) / suggestions.length
            ).toFixed(1)}
            %
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Filter:
        </span>
        <div className="flex rounded-lg border border-border">
          {[
            { key: 'all', label: 'All' },
            { key: 'critical', label: 'Critical' },
            { key: 'high', label: 'High Priority' },
            { key: 'easy', label: 'Easy Wins' },
          ].map(({ key, label }, index) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                index === 0 ? 'rounded-l-lg' : index === 3 ? 'rounded-r-lg' : ''
              } ${
                filter === key
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions list */}
      <div className="space-y-3">
        {sortedSuggestions.map((suggestion) => (
          <OptimizationCard
            key={suggestion.id}
            suggestion={suggestion}
            isSelected={selectedSuggestions.includes(suggestion.id)}
            isExpanded={expandedSuggestions.has(suggestion.id)}
            onToggleSelection={() => onToggleSelection(suggestion.id)}
            onToggleExpansion={() => toggleExpansion(suggestion.id)}
            onApply={() => onApplySuggestion(suggestion.id)}
            onDismiss={() => onDismissSuggestion(suggestion.id)}
            applicableNodes={getApplicableNodeNames(suggestion)}
          />
        ))}
      </div>

      {filteredSuggestions.length === 0 && filter !== 'all' && (
        <div className="text-center py-8">
          <div className="rounded-full bg-muted/50 h-16 w-16 mx-auto mb-4 flex items-center justify-center">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-2">
            No Suggestions Match Filter
          </h3>
          <p className="text-sm text-muted-foreground">
            Try changing your filter criteria or view all suggestions.
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-4 text-sm font-medium text-accent hover:text-accent/80"
          >
            View All Suggestions
          </button>
        </div>
      )}

      {/* Implementation note */}
      <div className="rounded-lg bg-muted/5 border border-muted/20 p-4">
        <div className="flex items-start space-x-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Implementation Tips</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>
                Start with critical priority suggestions for maximum impact
              </li>
              <li>
                Easy wins can be implemented quickly to see immediate results
              </li>
              <li>Test changes gradually and monitor performance metrics</li>
              <li>
                Some suggestions may conflict - review carefully before applying
                multiple changes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
