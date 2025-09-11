'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  FileText,
  Users,
  GitBranch,
  CheckCircle,
  ArrowRight,
  Eye,
  Edit3,
  Save,
  Palette,
  Zap,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { OptimizationSuggestions } from './OptimizationSuggestions';
import {
  GeneratedJourneyPreviewProps,
  JourneyNode,
  OptimizationSuggestion,
} from '@/types/journey-ai';

const NODE_TYPE_ICONS = {
  start: CheckCircle,
  email: Mail,
  sms: MessageSquare,
  form: FileText,
  meeting: Users,
  condition: GitBranch,
  split: GitBranch,
  timeline: Calendar,
  review: Eye,
  referral: TrendingUp,
  end: CheckCircle,
} as const;

const NODE_TYPE_COLORS = {
  start: 'bg-success/10 text-success border-success/20',
  email: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  sms: 'bg-green-500/10 text-green-600 border-green-500/20',
  form: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  meeting: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  condition: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  split: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  timeline: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  review: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  referral: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  end: 'bg-success/10 text-success border-success/20',
} as const;

interface JourneyNodeCardProps {
  node: JourneyNode;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  showOptimizations: boolean;
  optimizations: OptimizationSuggestion[];
}

function JourneyNodeCard({
  node,
  isSelected,
  onClick,
  onEdit,
  showOptimizations,
  optimizations,
}: JourneyNodeCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = NODE_TYPE_ICONS[node.type];
  const nodeOptimizations = optimizations.filter((opt) =>
    opt.applicableToNodes?.includes(node.id),
  );

  const formatTiming = (timing: typeof node.data.timing) => {
    if (timing.fromWedding) {
      return `${timing.delay} days before wedding`;
    }
    return timing.delay === 0
      ? 'Immediate'
      : `${timing.delay} days after previous`;
  };

  return (
    <div
      className={`relative rounded-lg border-2 bg-background transition-all hover:shadow-md ${
        isSelected
          ? 'border-accent shadow-sm'
          : 'border-border hover:border-accent/50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div
            className={`rounded-lg border p-2 ${NODE_TYPE_COLORS[node.type]}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-foreground truncate">
                {node.data.title}
              </h4>
              {node.data.metadata.aiGenerated && (
                <div className="rounded-full bg-accent/10 p-1">
                  <Sparkles className="h-3 w-3 text-accent" />
                </div>
              )}
            </div>

            {node.data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {node.data.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatTiming(node.data.timing)}</span>
              </div>

              <div className="flex items-center space-x-1">
                {node.data.metadata.confidence && (
                  <div className="flex items-center space-x-1 text-xs">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        node.data.metadata.confidence > 0.9
                          ? 'bg-success'
                          : node.data.metadata.confidence > 0.7
                            ? 'bg-warning'
                            : 'bg-danger'
                      }`}
                    />
                    <span className="text-muted-foreground">
                      {Math.round(node.data.metadata.confidence * 100)}%
                    </span>
                  </div>
                )}

                {nodeOptimizations.length > 0 && showOptimizations && (
                  <div className="flex items-center space-x-1 text-xs text-accent">
                    <Zap className="h-3 w-3" />
                    <span>{nodeOptimizations.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3 border-t border-border pt-3">
            {node.data.content && (
              <div className="space-y-2">
                {node.data.content.subject && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Subject
                    </p>
                    <p className="text-sm text-foreground">
                      {node.data.content.subject}
                    </p>
                  </div>
                )}
                {node.data.content.body && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Content
                    </p>
                    <p className="text-sm text-foreground line-clamp-3">
                      {node.data.content.body}
                    </p>
                  </div>
                )}
              </div>
            )}

            {node.data.metadata.reasoning && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Reasoning
                </p>
                <p className="text-sm text-muted-foreground">
                  {node.data.metadata.reasoning}
                </p>
              </div>
            )}

            {node.data.conditions && node.data.conditions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Conditions
                </p>
                <div className="space-y-1">
                  {node.data.conditions.map((condition, index) => (
                    <div key={index} className="rounded bg-muted p-2 text-sm">
                      <code className="text-accent">
                        {condition.field} {condition.operator}{' '}
                        {String(condition.value)}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="absolute -top-1 -right-1 rounded-full bg-accent p-1">
          <div className="h-2 w-2 rounded-full bg-accent-foreground" />
        </div>
      )}
    </div>
  );
}

export function GeneratedJourneyPreview({
  journey,
  selectedNodes = [],
  onNodeSelect,
  onNodeEdit,
  onSave,
  onCustomize,
  showOptimizations = false,
}: GeneratedJourneyPreviewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showOptimizationsPanel, setShowOptimizationsPanel] = useState(false);

  // Sort nodes by timing for timeline view
  const sortedNodes = useMemo(() => {
    return [...journey.journey.nodes].sort((a, b) => {
      // Start nodes first
      if (a.type === 'start') return -1;
      if (b.type === 'start') return 1;
      // End nodes last
      if (a.type === 'end') return 1;
      if (b.type === 'end') return -1;
      // Sort by timing
      return a.data.timing.delay - b.data.timing.delay;
    });
  }, [journey.journey.nodes]);

  // Calculate total journey duration
  const totalDuration = useMemo(() => {
    const maxDelay = Math.max(
      ...journey.journey.nodes.map((node) => node.data.timing.delay),
    );
    return maxDelay;
  }, [journey.journey.nodes]);

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect(nodeId);
  };

  const handleOptimizationToggle = (suggestionId: string) => {
    console.log('Toggle optimization:', suggestionId);
  };

  const handleApplyOptimization = (suggestionId: string) => {
    console.log('Apply optimization:', suggestionId);
  };

  const handleDismissOptimization = (suggestionId: string) => {
    console.log('Dismiss optimization:', suggestionId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {journey.journey.settings.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {journey.journey.settings.description}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{totalDuration} days total duration</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{journey.journey.nodes.length} touchpoints</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>
                {Math.round(journey.metadata.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setViewMode('timeline')}
              className={`rounded-l-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-r-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              List
            </button>
          </div>

          {/* Optimizations toggle */}
          {journey.optimizationSuggestions.length > 0 && (
            <button
              onClick={() => setShowOptimizationsPanel(!showOptimizationsPanel)}
              className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                showOptimizationsPanel
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>{journey.optimizationSuggestions.length} suggestions</span>
            </button>
          )}
        </div>
      </div>

      {/* Journey visualization */}
      <div className="relative">
        {viewMode === 'timeline' ? (
          <div className="space-y-4">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-border" />

              {/* Journey nodes */}
              <div className="space-y-6">
                {sortedNodes.map((node, index) => (
                  <div key={node.id} className="relative">
                    <div className="flex items-start space-x-4">
                      {/* Timeline marker */}
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background bg-elevated shadow-sm">
                        <div
                          className={`h-4 w-4 rounded-full ${
                            selectedNodes.includes(node.id)
                              ? 'bg-accent'
                              : 'bg-muted-foreground'
                          }`}
                        />
                      </div>

                      {/* Node card */}
                      <div className="flex-1 min-w-0">
                        <JourneyNodeCard
                          node={node}
                          isSelected={selectedNodes.includes(node.id)}
                          onClick={() => handleNodeClick(node.id)}
                          onEdit={() => onNodeEdit(node)}
                          showOptimizations={showOptimizations}
                          optimizations={journey.optimizationSuggestions}
                        />
                      </div>
                    </div>

                    {/* Connection arrow */}
                    {index < sortedNodes.length - 1 && (
                      <div className="ml-12 mt-2 flex items-center text-muted-foreground">
                        <ArrowRight className="h-4 w-4" />
                        <div className="ml-2 text-sm">
                          {sortedNodes[index + 1].data.timing.delay -
                            node.data.timing.delay}{' '}
                          days later
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="grid gap-4">
            {sortedNodes.map((node) => (
              <JourneyNodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodes.includes(node.id)}
                onClick={() => handleNodeClick(node.id)}
                onEdit={() => onNodeEdit(node)}
                showOptimizations={showOptimizations}
                optimizations={journey.optimizationSuggestions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Optimizations panel */}
      {showOptimizationsPanel && journey.optimizationSuggestions.length > 0 && (
        <div className="rounded-lg border border-border bg-elevated p-6">
          <OptimizationSuggestions
            suggestions={journey.optimizationSuggestions}
            selectedSuggestions={[]}
            onToggleSelection={handleOptimizationToggle}
            onApplySuggestion={handleApplyOptimization}
            onDismissSuggestion={handleDismissOptimization}
            journey={journey}
          />
        </div>
      )}

      {/* Journey tags */}
      {journey.journey.settings.tags.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {journey.journey.settings.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>
            Generated on {journey.metadata.generatedAt.toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCustomize}
            className="flex items-center space-x-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Palette className="h-4 w-4" />
            <span>Customize</span>
          </button>

          <button
            onClick={() => onSave(journey)}
            className="flex items-center space-x-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Save className="h-4 w-4" />
            <span>Save Journey</span>
          </button>
        </div>
      </div>
    </div>
  );
}
