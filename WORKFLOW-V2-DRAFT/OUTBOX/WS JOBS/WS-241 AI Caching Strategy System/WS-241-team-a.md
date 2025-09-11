# WS-241 AI Caching Strategy System - Team A Frontend

## Executive Summary
Build intelligent caching interfaces that give wedding suppliers real-time visibility into AI cost optimization, cache performance, and system efficiency while delivering instant responses that keep couples and vendors engaged during critical wedding planning moments.

## User Story Context
**Emma's Wedding Photography Studio** processes 200+ AI-powered client inquiries monthly during peak season. Each uncached query costs £0.12-0.45 in AI processing. Emma needs a dashboard showing her that WS-241's 85% cache hit rate is saving her £78/month, with instant <100ms responses for common questions like "What's your wedding package pricing?" and "Do you offer same-day editing?"

**Sarah, WedSync Product Manager**, needs visibility into AI usage patterns across 15,000+ suppliers. Her dashboard must show cache effectiveness by supplier type, seasonal trends, and identify opportunities for warming popular queries before peak demand.

## Your Team A Mission: AI Cache Visualization & Control Interfaces

### 🎯 Primary Objectives
1. **Cache Performance Dashboard**: Real-time visualization of AI cost savings and response time improvements
2. **Cache Configuration Interface**: Intuitive controls for cache warming, TTL management, and invalidation
3. **Analytics & Insights**: Visual analytics showing seasonal patterns and optimization opportunities
4. **User Experience Integration**: Seamless cache indicators and optimization within existing AI workflows
5. **Mobile-First Design**: Touch-optimized interfaces for suppliers managing cache on-the-go

### 🏗 Core Deliverables

#### 1. AI Cache Performance Dashboard (`/dashboard/ai/cache`)

```typescript
// Primary AI Cache Performance Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Clock, Database, Zap, DollarSign, 
  Activity, Settings, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CachePerformanceDashboardProps {
  supplierId: string;
  supplierType: 'photographer' | 'wedding_planner' | 'venue' | 'catering' | 'florist';
}

export default function CachePerformanceDashboard({ supplierId, supplierType }: CachePerformanceDashboardProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [performance, setPerformance] = useState<CachePerformance | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadCacheData();
  }, [supplierId, timeRange]);

  const loadCacheData = async () => {
    try {
      const [statsRes, performanceRes, seasonalRes] = await Promise.all([
        fetch(`/api/ai/cache/stats?supplier_id=${supplierId}&range=${timeRange}`),
        fetch(`/api/ai/cache/performance?supplier_id=${supplierId}&range=${timeRange}`),
        fetch(`/api/ai/cache/seasonal?supplier_id=${supplierId}`)
      ]);

      setStats(await statsRes.json());
      setPerformance(await performanceRes.json());
      setSeasonal(await seasonalRes.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
          <span>Loading AI cache performance...</span>
        </div>
      </div>
    );
  }

  const hitRate = stats?.overall.hitRate || 0;
  const monthlySavings = stats?.overall.monthlySavings || 0;
  const avgResponseTime = performance?.averageResponseTime || 0;

  return (
    <div className="space-y-6">
      {/* Header with key metrics and controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Cache Performance</h1>
          <p className="text-gray-600 mt-1">
            Optimize AI costs and response times for your {supplierType.replace('_', ' ')} business
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/dashboard/ai/cache/config', '_blank')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Cache
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-700">{hitRate.toFixed(1)}%</div>
            <Progress 
              value={hitRate} 
              className="mt-2 h-2" 
              style={{ '--progress-foreground': 'rgb(34, 197, 94)' } as any}
            />
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {hitRate >= 80 ? 'Excellent' : hitRate >= 65 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-700">£{monthlySavings.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">
              vs £{(monthlySavings / (hitRate / 100)).toFixed(2)} without caching
            </p>
            <div className="mt-2 text-xs text-gray-600">
              {stats?.overall.totalQueries.toLocaleString()} queries this month
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-700">{avgResponseTime}ms</div>
            <p className="text-xs text-purple-600 mt-1">
              {avgResponseTime < 100 ? '⚡ Lightning fast' : 
               avgResponseTime < 300 ? '🚀 Very fast' : 
               '🐌 Could be faster'}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              vs {(avgResponseTime * 8).toFixed(0)}ms without cache
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-700">{stats?.overall.storageUsed}</div>
            <p className="text-xs text-orange-600 mt-1">
              {stats?.overall.cacheEntries.toLocaleString()} entries
            </p>
            <Progress 
              value={(parseFloat(stats?.overall.storageUsed || '0') / 1000) * 100} 
              className="mt-2 h-2"
              style={{ '--progress-foreground': 'rgb(251, 146, 60)' } as any}
            />
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cache Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance?.metrics || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  className="text-xs"
                />
                <YAxis yAxisId="percentage" domain={[0, 100]} className="text-xs" />
                <YAxis yAxisId="time" orientation="right" className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'hitRate' ? `${value.toFixed(1)}%` :
                    name === 'responseTime' ? `${Math.round(value)}ms` :
                    name === 'savings' ? `£${value.toFixed(2)}` :
                    value.toFixed(2),
                    name === 'hitRate' ? 'Hit Rate' :
                    name === 'responseTime' ? 'Response Time' :
                    name === 'savings' ? 'Hourly Savings' :
                    'Quality Score'
                  ]}
                />
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="hitRate" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={false}
                  name="hitRate"
                />
                <Line 
                  yAxisId="time"
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name="responseTime"
                />
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="savings" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="savings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cache Types Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Cache Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byType.map((cacheType) => (
                <CacheTypePerformanceRow 
                  key={cacheType.type}
                  cacheType={cacheType}
                  supplierType={supplierType}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SeasonalInsightsDisplay 
                currentSeason={seasonal?.currentSeason}
                seasonalData={seasonal}
                supplierType={supplierType}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Cached Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Most Cached Queries</CardTitle>
          <p className="text-sm text-gray-600">
            Your most frequently cached AI responses - optimize these for maximum savings
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performance?.topQueries.slice(0, 8).map((query, index) => (
              <PopularQueryRow 
                key={index}
                query={query}
                rank={index + 1}
                supplierType={supplierType}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CacheOptimizationRecommendations 
            stats={stats}
            performance={performance}
            supplierType={supplierType}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Cache Type Performance Row Component
const CacheTypePerformanceRow = ({ cacheType, supplierType }) => {
  const getSupplierSpecificInsights = (type: string, supplierType: string) => {
    const insights = {
      photographer: {
        'chatbot': 'Client photo session inquiries',
        'email_templates': 'Wedding day timeline emails',
        'content_generation': 'Portfolio descriptions'
      },
      wedding_planner: {
        'chatbot': 'Vendor coordination questions',
        'email_templates': 'Client update communications', 
        'content_generation': 'Timeline planning content'
      },
      venue: {
        'chatbot': 'Availability and pricing queries',
        'email_templates': 'Event coordination emails',
        'content_generation': 'Venue description content'
      }
    };

    return insights[supplierType]?.[type] || 'General AI responses';
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              cacheType.hitRate >= 80 ? 'bg-green-500' :
              cacheType.hitRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              {cacheType.type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <Badge variant={cacheType.hitRate >= 80 ? 'default' : cacheType.hitRate >= 60 ? 'secondary' : 'destructive'}>
            {cacheType.hitRate.toFixed(1)}% hit rate
          </Badge>
        </div>
        <div className="text-right">
          <div className="font-medium text-green-600">£{cacheType.savingsThisMonth.toFixed(2)}</div>
          <div className="text-sm text-gray-500">{cacheType.entries} entries</div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {getSupplierSpecificInsights(cacheType.type, supplierType)}
      </div>

      <Progress value={cacheType.hitRate} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Quality:</span>
          <span className="ml-1 font-medium">{cacheType.avgQuality.toFixed(1)}/5</span>
        </div>
        <div>
          <span className="text-gray-500">Cached:</span>
          <span className="ml-1 font-medium text-green-600">{Math.round(cacheType.responseTimes.cached)}ms</span>
        </div>
        <div>
          <span className="text-gray-500">Generated:</span>
          <span className="ml-1 font-medium text-gray-400">{Math.round(cacheType.responseTimes.generated)}ms</span>
        </div>
      </div>
    </div>
  );
};

// Popular Query Row Component
const PopularQueryRow = ({ query, rank, supplierType }) => {
  const getWeddingContextIcon = (queryText: string) => {
    if (queryText.includes('pricing') || queryText.includes('cost')) return '💰';
    if (queryText.includes('timeline') || queryText.includes('schedule')) return '📅';
    if (queryText.includes('photo') || queryText.includes('picture')) return '📸';
    if (queryText.includes('venue') || queryText.includes('location')) return '🏛️';
    if (queryText.includes('guest') || queryText.includes('people')) return '👥';
    return '💭';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
          {rank}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getWeddingContextIcon(query.text)}</span>
          <span className="font-medium text-sm">{query.text.substring(0, 60)}...</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline" className="text-xs">
          {query.hitCount} hits
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {(query.avgConfidence * 100).toFixed(0)}% confidence
        </Badge>
        <div className="text-green-600 font-medium">
          £{query.savings.toFixed(2)} saved
        </div>
      </div>
    </div>
  );
};
```

#### 2. Cache Configuration Interface (`/dashboard/ai/cache/config`)

```typescript
// Advanced Cache Configuration Interface
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, Zap, Clock, Database, RefreshCw, 
  AlertCircle, CheckCircle, Trash2, Play 
} from 'lucide-react';

export default function CacheConfigurationInterface() {
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('cache-types');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    const response = await fetch('/api/ai/cache/config');
    setConfig(await response.json());
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      await fetch('/api/ai/cache/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      // Show success notification
      showNotification('Configuration saved successfully!', 'success');
    } catch (error) {
      showNotification('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const triggerCacheWarming = async (strategy: string) => {
    try {
      const response = await fetch('/api/ai/cache/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategy,
          priority: 3,
          maxQueries: 100
        })
      });
      
      const result = await response.json();
      showNotification(`Cache warming started: ${result.queriesQueued} queries queued`, 'success');
    } catch (error) {
      showNotification('Failed to start cache warming', 'error');
    }
  };

  if (!config) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Cache Configuration</h1>
          <p className="text-gray-600">Optimize your AI cache for maximum performance and cost savings</p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cache-types">Cache Types</TabsTrigger>
          <TabsTrigger value="warming">Cache Warming</TabsTrigger>
          <TabsTrigger value="invalidation">Invalidation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="wedding-optimization">Wedding Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="cache-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Type Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {config.cacheTypes.map((cacheType, index) => (
                <CacheTypeConfiguration
                  key={cacheType.type}
                  cacheType={cacheType}
                  onChange={(updated) => {
                    const newConfig = { ...config };
                    newConfig.cacheTypes[index] = updated;
                    setConfig(newConfig);
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warming" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automatic Cache Warming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CacheWarmingConfiguration 
                  config={config.warming}
                  onChange={(updated) => setConfig({...config, warming: updated})}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Warming Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <ManualWarmingControls onTrigger={triggerCacheWarming} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wedding-optimization" className="space-y-6">
          <WeddingSpecificOptimization 
            config={config}
            onChange={setConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Cache Type Configuration Component
const CacheTypeConfiguration = ({ cacheType, onChange }) => {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-lg">
            {cacheType.type.replace('_', ' ').toUpperCase()}
          </h3>
          <Badge variant="outline" className="text-xs">
            {cacheType.entries?.toLocaleString() || 0} entries
          </Badge>
        </div>
        <Switch
          checked={cacheType.enabled}
          onCheckedChange={(checked) => onChange({ ...cacheType, enabled: checked })}
        />
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {getWeddingContextDescription(cacheType.type)}
      </div>

      {cacheType.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                TTL Hours: {cacheType.ttlHours}
              </label>
              <Slider
                value={[cacheType.ttlHours]}
                onValueChange={([value]) => onChange({ ...cacheType, ttlHours: value })}
                max={720}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 hour</span>
                <span>30 days</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Max Entries: {cacheType.maxEntries.toLocaleString()}
              </label>
              <Slider
                value={[cacheType.maxEntries]}
                onValueChange={([value]) => onChange({ ...cacheType, maxEntries: value })}
                max={100000}
                min={100}
                step={100}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Semantic Threshold: {(cacheType.semanticThreshold * 100).toFixed(0)}%
              </label>
              <Slider
                value={[cacheType.semanticThreshold * 100]}
                onValueChange={([value]) => onChange({ ...cacheType, semanticThreshold: value / 100 })}
                max={99}
                min={50}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                How similar queries need to be to use cached responses
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enable Warming</label>
              <Switch
                checked={cacheType.warmingEnabled}
                onCheckedChange={(checked) => onChange({ ...cacheType, warmingEnabled: checked })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wedding-Specific Optimization Component
const WeddingSpecificOptimization = ({ config, onChange }) => {
  const [seasonalSettings, setSeasonalSettings] = useState(config?.weddingOptimization || {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Wedding Optimization</CardTitle>
          <p className="text-sm text-gray-600">
            Automatically adjust cache settings based on wedding season patterns
          </p>
        </CardHeader>
        <CardContent>
          <SeasonalOptimizationSettings 
            settings={seasonalSettings}
            onChange={setSeasonalSettings}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor-Specific Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorSpecificSettings 
            config={config}
            onChange={onChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Get wedding context description for cache types
const getWeddingContextDescription = (type: string): string => {
  const descriptions = {
    'chatbot': 'AI responses to client inquiries about services, pricing, and availability',
    'email_templates': 'Generated email content for client communications and vendor coordination',
    'content_generation': 'Marketing content, service descriptions, and portfolio text',
    'form_generation': 'Dynamic forms for client consultations and service bookings'
  };
  
  return descriptions[type] || 'General AI-generated content for your wedding business';
};
```

### 🎨 Mobile-First Interface Design

#### Touch-Optimized Cache Management
```typescript
// Mobile-optimized cache management interface
const MobileCacheInterface = () => {
  return (
    <div className="mobile-cache-interface">
      {/* Quick Stats Cards - Swipeable */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 px-4" style={{ width: 'max-content' }}>
          <QuickStatCard 
            title="Hit Rate" 
            value="85.3%" 
            trend="+2.1%" 
            color="green"
            size="compact"
          />
          <QuickStatCard 
            title="Savings" 
            value="£78/mo" 
            trend="+£12" 
            color="blue"
            size="compact"
          />
          <QuickStatCard 
            title="Speed" 
            value="94ms" 
            trend="-15ms" 
            color="purple"
            size="compact"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="font-medium mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <TouchButton
            icon={<Zap className="h-5 w-5" />}
            label="Warm Cache"
            sublabel="Popular queries"
            onClick={() => triggerQuickWarming()}
            color="green"
          />
          <TouchButton
            icon={<RefreshCw className="h-5 w-5" />}
            label="Clear Old"
            sublabel="Free storage" 
            onClick={() => clearOldEntries()}
            color="orange"
          />
        </div>
      </div>

      {/* Performance Summary */}
      <Card className="mx-4 mb-6">
        <CardContent className="pt-4">
          <MobilePerformanceChart />
        </CardContent>
      </Card>

      {/* Recent Cache Activity */}
      <div className="px-4">
        <h3 className="font-medium mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recentActivity.map((activity, index) => (
            <MobileCacheActivityRow key={index} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Touch-optimized button component
const TouchButton = ({ icon, label, sublabel, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-4 rounded-xl border-2 
        bg-gradient-to-br active:scale-95 transition-transform
        ${color === 'green' ? 'from-green-50 to-green-100 border-green-200 text-green-700' :
          color === 'orange' ? 'from-orange-50 to-orange-100 border-orange-200 text-orange-700' :
          'from-gray-50 to-gray-100 border-gray-200 text-gray-700'}
      `}
      style={{ minHeight: '80px' }}
    >
      {icon}
      <span className="font-medium text-sm mt-1">{label}</span>
      <span className="text-xs opacity-75">{sublabel}</span>
    </button>
  );
};
```

### 🧪 Testing Requirements

#### Frontend Testing Suites
```typescript
// Comprehensive frontend testing for AI cache interfaces
describe('AI Cache Dashboard', () => {
  describe('Performance Metrics Display', () => {
    test('shows accurate cache hit rates for different supplier types', async () => {
      const photographerStats = await renderDashboard({ supplierType: 'photographer' });
      const plannerStats = await renderDashboard({ supplierType: 'wedding_planner' });
      
      expect(photographerStats.getByText(/hit rate/i)).toBeInTheDocument();
      expect(photographerStats.getByText(/photography/i)).toBeInTheDocument();
    });

    test('displays wedding season multipliers correctly', async () => {
      jest.setSystemTime(new Date('2024-06-15')); // Peak season
      
      const { getByTestId } = await renderDashboard();
      const seasonalIndicator = getByTestId('seasonal-indicator');
      
      expect(seasonalIndicator).toHaveTextContent(/peak season/i);
      expect(seasonalIndicator).toHaveClass('season-peak');
    });

    test('shows cost savings with wedding industry context', async () => {
      const { getByTestId } = await renderDashboard({
        stats: { monthlySavings: 78.50, hitRate: 85.3 }
      });
      
      expect(getByTestId('monthly-savings')).toHaveTextContent('£78.50');
      expect(getByTestId('without-cache-cost')).toBeInTheDocument();
    });
  });

  describe('Mobile Interface', () => {
    test('adapts to touch interactions on mobile', async () => {
      const { getByRole } = await renderMobile(<CacheDashboard />);
      
      const warmCacheButton = getByRole('button', { name: /warm cache/i });
      expect(warmCacheButton).toHaveStyle({ minHeight: '80px' });
      
      fireEvent.touchStart(warmCacheButton);
      expect(warmCacheButton).toHaveClass('active:scale-95');
    });

    test('displays swipeable performance cards', async () => {
      const { container } = await renderMobile(<CacheDashboard />);
      const swipeContainer = container.querySelector('.overflow-x-auto');
      
      expect(swipeContainer).toBeInTheDocument();
      expect(swipeContainer.children.length).toBeGreaterThan(2);
    });
  });

  describe('Cache Configuration', () => {
    test('allows TTL adjustment with wedding context warnings', async () => {
      const { getByRole, getByText } = render(<CacheConfiguration />);
      
      const ttlSlider = getByRole('slider', { name: /ttl hours/i });
      fireEvent.change(ttlSlider, { target: { value: 1 } });
      
      expect(getByText(/wedding season/i)).toBeInTheDocument();
      expect(getByText(/very short ttl/i)).toBeInTheDocument();
    });

    test('shows wedding-specific optimization recommendations', async () => {
      const { getByTestId } = render(<CacheConfiguration />);
      
      const recommendations = getByTestId('wedding-recommendations');
      expect(recommendations).toHaveTextContent(/peak season/i);
      expect(recommendations).toHaveTextContent(/vendor coordination/i);
    });
  });

  describe('Real-time Updates', () => {
    test('updates metrics in real-time during cache operations', async () => {
      const { getByTestId, rerender } = render(<CacheDashboard />);
      
      const initialHitRate = getByTestId('hit-rate').textContent;
      
      // Simulate cache hit
      mockWebSocket.emit('cache_hit', { newHitRate: 87.2 });
      
      await waitFor(() => {
        expect(getByTestId('hit-rate')).not.toHaveTextContent(initialHitRate);
      });
    });

    test('shows warming progress in real-time', async () => {
      const { getByTestId } = render(<CacheConfiguration />);
      
      fireEvent.click(getByTestId('warm-cache-button'));
      
      await waitFor(() => {
        expect(getByTestId('warming-progress')).toBeInTheDocument();
      });
    });
  });
});

// Wedding-specific testing scenarios
describe('Wedding Industry Cache Scenarios', () => {
  test('handles peak wedding season load indicators', async () => {
    const peakSeasonData = {
      currentSeason: 'peak',
      multiplier: 1.6,
      recommendedTTL: 48
    };
    
    const { getByTestId } = render(
      <SeasonalOptimization data={peakSeasonData} />
    );
    
    expect(getByTestId('season-warning')).toHaveTextContent(/high demand/i);
  });

  test('displays supplier-specific cache performance', async () => {
    const scenarios = [
      { supplierType: 'photographer', expectedCategory: 'photo session inquiries' },
      { supplierType: 'wedding_planner', expectedCategory: 'vendor coordination' },
      { supplierType: 'venue', expectedCategory: 'availability queries' }
    ];

    for (const scenario of scenarios) {
      const { getByText } = render(
        <CacheTypeBreakdown supplierType={scenario.supplierType} />
      );
      
      expect(getByText(scenario.expectedCategory)).toBeInTheDocument();
    }
  });
});
```

### 📊 Performance Monitoring Integration

#### Frontend Performance Tracking
```typescript
// Performance monitoring for cache interface
class CacheInterfaceMonitoring {
  constructor() {
    this.performanceObserver = new PerformanceObserver(this.handlePerformanceEntries);
    this.vitals = new WebVitals();
  }

  setupCacheInterfaceMonitoring() {
    // Monitor cache dashboard load performance
    this.trackDashboardMetrics();
    
    // Monitor configuration interface responsiveness
    this.trackConfigurationPerformance();
    
    // Monitor mobile interface touch responsiveness
    this.trackMobilePerformance();
  }

  trackDashboardMetrics() {
    // Track time to interactive for cache dashboard
    this.vitals.measureTTI('cache_dashboard', () => {
      return document.querySelector('[data-testid="cache-stats"]') !== null;
    });

    // Track largest contentful paint for performance charts
    this.vitals.measureLCP('cache_charts');

    // Track cumulative layout shift for real-time updates
    this.vitals.measureCLS('cache_realtime_updates');
  }

  trackConfigurationPerformance() {
    // Monitor slider interaction responsiveness
    document.addEventListener('input', (event) => {
      if (event.target.type === 'range') {
        this.measureInteractionLatency('slider_interaction', event);
      }
    });

    // Track cache warming trigger response time
    this.trackAsyncAction('cache_warming_trigger', '/api/ai/cache/warm');
  }

  // Wedding season specific performance tracking
  trackWeddingSeasonPerformance() {
    const currentSeason = this.getCurrentWeddingSeason();
    
    if (currentSeason === 'peak') {
      // More aggressive performance tracking during peak season
      this.vitals.setPerformanceThresholds({
        LCP: 2000, // 2s instead of 2.5s
        FID: 50,   // 50ms instead of 100ms
        CLS: 0.05  // Stricter layout shift tolerance
      });
    }
  }
}
```

---

## Timeline & Dependencies

### Development Phases (Team A)
**Phase 1** (Weeks 1-2): Core dashboard components, performance visualization, basic configuration
**Phase 2** (Weeks 3-4): Mobile optimization, real-time updates, advanced configuration
**Phase 3** (Weeks 5-6): Wedding-specific features, seasonal optimization, analytics integration
**Phase 4** (Weeks 7-8): Polish, testing, performance optimization, accessibility compliance

### Critical Dependencies
- **Team B**: API endpoints for cache statistics, configuration, and control
- **Team D**: AI performance metrics and cache effectiveness data
- **Team C**: Integration with existing UI components and design system
- **Team E**: Real-time data streaming infrastructure for live updates

### Risk Mitigation
- **Complex Visualizations**: Start with simple charts, enhance iteratively
- **Mobile Performance**: Implement virtual scrolling and lazy loading early
- **Real-time Updates**: Graceful degradation when WebSocket connections fail

---

*This comprehensive frontend system transforms AI cache complexity into intuitive, actionable interfaces that wedding suppliers can use to optimize costs and performance while maintaining the instant responsiveness their clients expect.*