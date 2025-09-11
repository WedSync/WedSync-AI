/**
 * WS-234 Query Optimization Panel
 * Advanced query performance analysis and optimization interface
 *
 * Features:
 * - Slow query visualization with execution plans
 * - Optimization suggestions with estimated performance improvement
 * - Index recommendation engine for common patterns
 * - Query rewriting assistance for N+1 problems
 * - Performance impact calculator for optimization changes
 * - Wedding-specific query optimization priorities
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Code,
  Database,
  Heart,
  Lightbulb,
  Play,
  Search,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Settings,
  Target,
  Timer,
  Wrench,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import type {
  SlowQuery,
  OptimizationSuggestion,
} from '@/lib/monitoring/database-health-monitor';

export interface QueryOptimizationPanelProps {
  slowQueries: SlowQuery[];
  onOptimizeQuery: (
    queryId: string,
    optimization: OptimizationSuggestion,
  ) => void;
  onKillQuery: (queryId: string) => void;
  showExecutionPlans?: boolean;
  maxQueries?: number;
}

export function QueryOptimizationPanel({
  slowQueries = [],
  onOptimizeQuery,
  onKillQuery,
  showExecutionPlans = true,
  maxQueries = 50,
}: QueryOptimizationPanelProps) {
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null);
  const [activeTab, setActiveTab] = useState('queries');
  const [filterWeddingOnly, setFilterWeddingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'avgTime' | 'calls' | 'totalTime'>(
    'avgTime',
  );

  // Filter and sort queries
  const filteredQueries = slowQueries
    .filter((query) => !filterWeddingOnly || query.isWeddingRelated)
    .sort((a, b) => {
      switch (sortBy) {
        case 'avgTime':
          return b.avgTime - a.avgTime;
        case 'calls':
          return b.calls - a.calls;
        case 'totalTime':
          return b.totalTime - a.totalTime;
        default:
          return b.avgTime - a.avgTime;
      }
    })
    .slice(0, maxQueries);

  const weddingQueries = slowQueries.filter((q) => q.isWeddingRelated);
  const criticalQueries = slowQueries.filter((q) => q.avgTime > 1000);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'hard':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'easy':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Query Optimization Center
            </CardTitle>
            <CardDescription>
              Analyze slow queries and implement performance optimizations
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline">{filteredQueries.length} queries</Badge>
            {weddingQueries.length > 0 && (
              <Badge className="bg-pink-100 text-pink-800">
                <Heart className="h-3 w-3 mr-1" />
                {weddingQueries.length} wedding critical
              </Badge>
            )}
            {criticalQueries.length > 0 && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalQueries.length} critical
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="queries">Slow Queries</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="patterns">Query Patterns</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="queries" className="space-y-4">
              <QueriesTab
                queries={filteredQueries}
                selectedQuery={selectedQuery}
                onSelectQuery={setSelectedQuery}
                filterWeddingOnly={filterWeddingOnly}
                onFilterChange={setFilterWeddingOnly}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onKillQuery={onKillQuery}
                showExecutionPlans={showExecutionPlans}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <RecommendationsTab
                queries={filteredQueries}
                onOptimizeQuery={onOptimizeQuery}
              />
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <PatternsTab
                queries={filteredQueries}
                onOptimizeQuery={onOptimizeQuery}
              />
            </TabsContent>

            <TabsContent value="impact" className="space-y-4">
              <ImpactAnalysisTab queries={filteredQueries} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Queries Tab Component
function QueriesTab({
  queries,
  selectedQuery,
  onSelectQuery,
  filterWeddingOnly,
  onFilterChange,
  sortBy,
  onSortChange,
  onKillQuery,
  showExecutionPlans,
}: any) {
  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={filterWeddingOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(!filterWeddingOnly)}
            className={
              filterWeddingOnly
                ? 'bg-pink-100 text-pink-800 border-pink-200'
                : ''
            }
          >
            <Heart className="h-4 w-4 mr-1" />
            Wedding Only
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant={sortBy === 'avgTime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('avgTime')}
          >
            Avg Time
          </Button>
          <Button
            variant={sortBy === 'calls' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('calls')}
          >
            Calls
          </Button>
          <Button
            variant={sortBy === 'totalTime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('totalTime')}
          >
            Total Time
          </Button>
        </div>
      </div>

      {/* Queries List */}
      <div className="space-y-3">
        {queries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No slow queries found</p>
                <p className="text-sm text-muted-foreground">
                  All queries are performing within acceptable thresholds
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          queries.map((query: SlowQuery, index: number) => (
            <QueryCard
              key={`${query.queryHash}-${index}`}
              query={query}
              index={index}
              isSelected={selectedQuery?.queryHash === query.queryHash}
              onSelect={() => onSelectQuery(query)}
              onKill={() => onKillQuery(query.queryHash)}
              showExecutionPlans={showExecutionPlans}
            />
          ))
        )}
      </div>

      {/* Selected Query Details */}
      {selectedQuery && (
        <QueryDetailsPanel
          query={selectedQuery}
          onClose={() => onSelectQuery(null)}
        />
      )}
    </div>
  );
}

// Individual Query Card Component
function QueryCard({
  query,
  index,
  isSelected,
  onSelect,
  onKill,
  showExecutionPlans,
}: any) {
  const [isOpen, setIsOpen] = useState(false);

  const getPriorityColor = (avgTime: number, isWeddingRelated: boolean) => {
    if (isWeddingRelated && avgTime > 1000) return 'border-red-300 bg-red-50';
    if (avgTime > 2000) return 'border-red-200 bg-red-25';
    if (avgTime > 1000) return 'border-orange-200 bg-orange-25';
    if (avgTime > 500) return 'border-yellow-200 bg-yellow-25';
    return 'border-gray-200';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        className={`${getPriorityColor(query.avgTime, query.isWeddingRelated)} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Query #{index + 1}
                  </span>
                  {query.isWeddingRelated && (
                    <Badge className="bg-pink-100 text-pink-800">
                      <Heart className="h-3 w-3 mr-1" />
                      Wedding
                    </Badge>
                  )}
                  {query.avgTime > 1000 && (
                    <Badge className="bg-red-100 text-red-800">Critical</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="font-bold">
                    {query.avgTime.toFixed(0)}ms avg
                  </div>
                  <div className="text-muted-foreground">
                    {query.calls} calls
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold">
                    {query.maxTime.toFixed(0)}ms max
                  </div>
                  <div className="text-muted-foreground">
                    {(query.totalTime / 1000).toFixed(1)}s total
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Analyze
                </Button>

                {query.avgTime > 2000 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onKill();
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Kill
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Query Text */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Query
                </label>
                <div className="mt-1 p-3 bg-gray-100 rounded-md font-mono text-sm overflow-x-auto">
                  {query.query}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(query.query)}
                  className="mt-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-bold text-lg">
                    {query.avgTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Average</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-bold text-lg">
                    {query.maxTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Maximum</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-bold text-lg">{query.calls}</div>
                  <div className="text-sm text-muted-foreground">Calls</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-bold text-lg">
                    {(query.totalTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Time
                  </div>
                </div>
              </div>

              {/* Optimization Suggestion */}
              {query.optimization && (
                <OptimizationSuggestionCard
                  suggestion={query.optimization}
                  onApply={() => {
                    // Handle optimization application
                    console.log(
                      'Apply optimization for query:',
                      query.queryHash,
                    );
                  }}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Optimization Suggestion Card
function OptimizationSuggestionCard({ suggestion, onApply }: any) {
  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">
            Optimization Suggestion
          </span>
          <Badge className={`${getImpactColor(suggestion.impact)}`}>
            {suggestion.impact} impact
          </Badge>
        </div>
        <Badge
          variant="outline"
          className={getComplexityColor(suggestion.implementationComplexity)}
        >
          {suggestion.implementationComplexity} complexity
        </Badge>
      </div>

      <p className="text-sm text-blue-800 mb-3">{suggestion.description}</p>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <strong>Estimated improvement:</strong>{' '}
          {suggestion.estimatedImprovement}
        </div>
        <Button
          size="sm"
          onClick={onApply}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Wrench className="h-3 w-3 mr-1" />
          Apply
        </Button>
      </div>

      <div className="mt-3 p-3 bg-white rounded border text-sm font-mono">
        <strong>Action:</strong> {suggestion.action}
      </div>
    </div>
  );
}

// Query Details Panel
function QueryDetailsPanel({ query, onClose }: any) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-blue-900">
            Query Analysis Details
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Performance Impact</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>CPU Time per Call:</span>
                <span className="font-medium">
                  {query.avgTime.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total CPU Impact:</span>
                <span className="font-medium">
                  {(query.totalTime / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frequency:</span>
                <span className="font-medium">{query.calls} executions</span>
              </div>
              <div className="flex justify-between">
                <span>Wedding Critical:</span>
                <Badge
                  variant={query.isWeddingRelated ? 'default' : 'secondary'}
                >
                  {query.isWeddingRelated ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Optimization Priority</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    query.avgTime > 1000
                      ? 'bg-red-500'
                      : query.avgTime > 500
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                ></div>
                <span className="text-sm">
                  {query.avgTime > 1000
                    ? 'High Priority'
                    : query.avgTime > 500
                      ? 'Medium Priority'
                      : 'Low Priority'}
                </span>
              </div>

              {query.optimization && (
                <div className="text-sm">
                  <strong>Recommended Action:</strong>
                  <p className="mt-1 text-muted-foreground">
                    {query.optimization.action}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Recommendations Tab
function RecommendationsTab({ queries, onOptimizeQuery }: any) {
  // Group queries by optimization type
  const recommendations = queries.reduce((acc: any, query: SlowQuery) => {
    const type = query.optimization?.type || 'general';
    if (!acc[type]) acc[type] = [];
    acc[type].push(query);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(recommendations).map(
        ([type, queryList]: [string, any]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">
                {type.replace('_', ' ')} Optimizations
              </CardTitle>
              <CardDescription>
                {queryList.length} queries can benefit from this optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queryList
                  .slice(0, 5)
                  .map((query: SlowQuery, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-mono text-sm bg-gray-100 p-2 rounded mb-2 truncate">
                          {query.query}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{query.avgTime.toFixed(0)}ms avg</span>
                          <span>{query.calls} calls</span>
                          {query.isWeddingRelated && (
                            <Badge className="bg-pink-100 text-pink-800">
                              Wedding
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() =>
                          onOptimizeQuery(query.queryHash, query.optimization)
                        }
                        className="ml-4"
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Optimize
                      </Button>
                    </div>
                  ))}

                {queryList.length > 5 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    ... and {queryList.length - 5} more queries
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ),
      )}
    </div>
  );
}

// Patterns Tab
function PatternsTab({ queries, onOptimizeQuery }: any) {
  // Analyze query patterns
  const patterns = {
    selectStar: queries.filter((q: SlowQuery) =>
      q.query.toLowerCase().includes('select *'),
    ),
    nPlusOne: queries.filter(
      (q: SlowQuery) => q.calls > 100 && q.avgTime < 100,
    ),
    missingIndex: queries.filter(
      (q: SlowQuery) => q.optimization?.type === 'missing_index',
    ),
    weddingCritical: queries.filter(
      (q: SlowQuery) => q.isWeddingRelated && q.avgTime > 500,
    ),
  };

  return (
    <div className="space-y-4">
      {/* Pattern Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SELECT * Queries</CardTitle>
            <CardDescription>
              {patterns.selectStar.length} queries selecting all columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {patterns.selectStar.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Potential for 20-40% performance improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">N+1 Patterns</CardTitle>
            <CardDescription>
              {patterns.nPlusOne.length} potential N+1 query patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {patterns.nPlusOne.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Could reduce queries by 70-90%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Missing Indexes</CardTitle>
            <CardDescription>
              {patterns.missingIndex.length} queries needing indexes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {patterns.missingIndex.length}
            </div>
            <p className="text-sm text-muted-foreground">
              60-80% faster with proper indexes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Wedding Critical</CardTitle>
            <CardDescription>
              {patterns.weddingCritical.length} slow wedding-related queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {patterns.weddingCritical.length}
            </div>
            <p className="text-sm text-muted-foreground">
              High priority for optimization
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Impact Analysis Tab
function ImpactAnalysisTab({ queries }: any) {
  const totalTime = queries.reduce(
    (sum: number, q: SlowQuery) => sum + q.totalTime,
    0,
  );
  const avgTime =
    queries.length > 0
      ? queries.reduce((sum: number, q: SlowQuery) => sum + q.avgTime, 0) /
        queries.length
      : 0;
  const weddingQueries = queries.filter((q: SlowQuery) => q.isWeddingRelated);
  const criticalQueries = queries.filter((q: SlowQuery) => q.avgTime > 1000);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total CPU Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalTime / 1000).toFixed(1)}s
            </div>
            <p className="text-sm text-muted-foreground">
              Across all slow queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Query Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTime.toFixed(0)}ms</div>
            <p className="text-sm text-muted-foreground">Mean execution time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Wedding Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {weddingQueries.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Wedding-critical queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalQueries.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Queries {'>'} 1000ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Potential Improvements */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Impact Estimation</CardTitle>
          <CardDescription>
            Estimated performance improvements from implementing suggested
            optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Index Optimizations</div>
                <div className="text-sm text-muted-foreground">
                  {patterns.missingIndex?.length || 0} queries could benefit
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">60-80% faster</div>
                <div className="text-sm text-muted-foreground">
                  Estimated improvement
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Query Rewriting</div>
                <div className="text-sm text-muted-foreground">
                  N+1 patterns and SELECT * optimization
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">30-50% faster</div>
                <div className="text-sm text-muted-foreground">
                  Estimated improvement
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Wedding Season Optimization</div>
                <div className="text-sm text-muted-foreground">
                  Focus on wedding-critical query paths
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-pink-600">2x capacity</div>
                <div className="text-sm text-muted-foreground">
                  Peak season handling
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'hard':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'easy':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};

export default QueryOptimizationPanel;
