'use client';

import { useState, useMemo, startTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  useEnhancedViralMetrics,
  useViralSimulationPresets,
} from '@/hooks/useEnhancedViralMetrics';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Sankey,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { ViralIntervention } from '@/lib/analytics/viral-optimization-engine';

interface EnhancedViralDashboardProps {
  timeframe?: '7d' | '30d' | '90d' | '1y';
  vendorTypeFilter?: string[];
}

export function EnhancedViralDashboard({
  timeframe = '30d',
  vendorTypeFilter = [],
}: EnhancedViralDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedVendorType, setSelectedVendorType] = useState<string>('all');
  const [selectedSimulation, setSelectedSimulation] =
    useState<ViralIntervention | null>(null);

  const {
    metrics,
    simulation,
    refreshMetrics,
    runSimulation,
    isHealthy,
    growthTrend,
    topBottleneck,
    topRecommendation,
    coefficientTrendData,
    loopPerformanceData,
    seasonalData,
  } = useEnhancedViralMetrics({
    timeframe: selectedTimeframe,
    vendorType: selectedVendorType === 'all' ? undefined : selectedVendorType,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
  });

  const simulationPresets = useViralSimulationPresets();

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    startTransition(() => {
      setSelectedTimeframe(newTimeframe as any);
    });
  };

  // Handle simulation
  const handleRunSimulation = async (intervention: ViralIntervention) => {
    setSelectedSimulation(intervention);
    await runSimulation(intervention, intervention.duration);
  };

  // Memoized chart colors
  const chartColors = useMemo(
    () => ({
      primary: '#8B5CF6',
      secondary: '#EC4899',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
    }),
    [],
  );

  // Format coefficient trend data for charts
  const formattedTrendData = useMemo(() => {
    return coefficientTrendData.map((point) => ({
      ...point,
      value: Number(point.value.toFixed(3)),
    }));
  }, [coefficientTrendData]);

  // Wedding industry colors for seasonal chart
  const seasonalColors = useMemo(() => {
    return seasonalData.map((point) => {
      if (point.multiplier >= 1.4) return chartColors.success;
      if (point.multiplier >= 1.1) return chartColors.warning;
      return chartColors.info;
    });
  }, [seasonalData, chartColors]);

  if (metrics.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg font-medium">
          Loading viral metrics...
        </span>
      </div>
    );
  }

  if (metrics.error) {
    return (
      <Alert className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load viral metrics: {metrics.error}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const enhanced = metrics.enhanced;
  if (!enhanced) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No viral metrics data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Enhanced Viral Metrics
          </h1>
          <p className="text-gray-600 mt-1">
            Track and optimize viral growth with wedding industry intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={handleTimeframeChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedVendorType}
            onValueChange={setSelectedVendorType}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              <SelectItem value="photographer">Photographers</SelectItem>
              <SelectItem value="venue">Venues</SelectItem>
              <SelectItem value="florist">Florists</SelectItem>
              <SelectItem value="caterer">Caterers</SelectItem>
              <SelectItem value="planner">Planners</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={refreshMetrics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        {isHealthy ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600" />
        )}
        <span className="font-medium">
          Viral Health: {isHealthy ? 'Healthy' : 'Needs Attention'}
        </span>
        <Badge
          variant={
            growthTrend === 'up'
              ? 'default'
              : growthTrend === 'down'
                ? 'destructive'
                : 'secondary'
          }
        >
          {growthTrend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
          {growthTrend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
          {growthTrend === 'stable' && <Activity className="h-3 w-3 mr-1" />}
          {growthTrend}
        </Badge>
        {metrics.lastUpdated && (
          <span className="text-sm text-gray-500 ml-auto">
            Updated: {metrics.lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Viral Coefficient
            </CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enhanced.coefficient.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Seasonal: {enhanced.adjustedCoefficient.toFixed(2)} | Sustainable:{' '}
              {enhanced.sustainableCoefficient.toFixed(2)}
            </p>
            <div className="text-xs mt-1">
              <span
                className={
                  enhanced.coefficient > 1 ? 'text-green-600' : 'text-red-600'
                }
              >
                {enhanced.coefficient > 1
                  ? 'Viral Growth'
                  : 'Below Viral Threshold'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invitation Rate
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(enhanced.invitationRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              {enhanced.avgInvitesPerUser.toFixed(1)} invites/user avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(enhanced.acceptanceRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              Activation: {(enhanced.activationRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cycle Time</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enhanced.viralCycleTime.toFixed(0)}d
            </div>
            <p className="text-xs text-gray-600">
              Quality Score: {(enhanced.qualityScore * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loops">Viral Loops</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="optimization">Optimize</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Viral Coefficient Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Viral Coefficient Trend</CardTitle>
                <CardDescription>
                  Tracking viral growth over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      dot={{ fill: chartColors.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Vendor Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
                <CardDescription>Viral metrics by vendor type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhanced.vendorTypeBreakdown.map((vendor, index) => (
                    <div
                      key={vendor.vendorType}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize font-medium">
                        {vendor.vendorType}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(vendor.coefficient * 50, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12">
                          {vendor.coefficient.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Spread */}
          <Card>
            <CardHeader>
              <CardTitle>Geographic Viral Spread</CardTitle>
              <CardDescription>Viral strength by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {enhanced.geographicSpread.map((geo, index) => (
                  <div key={geo.region} className="p-4 border rounded-lg">
                    <h4 className="font-semibold">{geo.region}</h4>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Viral Strength:</span>
                        <span className="font-mono">
                          {geo.viralStrength.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Network Density:</span>
                        <span className="font-mono">
                          {(geo.networkDensity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cluster Size:</span>
                        <span className="font-mono">{geo.clusterSize}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Viral Loops Tab */}
        <TabsContent value="loops" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Loop Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Viral Loop Performance</CardTitle>
                <CardDescription>
                  Comparison of different referral loops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={loopPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Loop Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Loop Details</CardTitle>
                <CardDescription>
                  Detailed metrics for each viral loop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhanced.loops.map((loop, index) => (
                    <div key={loop.type} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium capitalize">
                          {loop.type.replace(/_/g, ' → ')}
                        </h4>
                        <Badge variant="outline">{loop.count} loops</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Conversion:</span>
                          <span className="ml-1 font-mono">
                            {(loop.conversionRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Revenue:</span>
                          <span className="ml-1 font-mono">
                            £{loop.revenue.toFixed(0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Cycle Time:</span>
                          <span className="ml-1 font-mono">
                            {loop.avgCycleTime.toFixed(1)}d
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Quality:</span>
                          <span className="ml-1 font-mono">
                            {(loop.quality * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dominant Loop Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Loop Analysis</CardTitle>
              <CardDescription>
                Insights about your viral loop performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">
                    Dominant Loop: {enhanced.dominantLoop.replace(/_/g, ' → ')}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    This loop type drives the most viral growth in your platform
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">
                    Loop Efficiency:{' '}
                    {(enhanced.loopEfficiency * 100).toFixed(1)}%
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Overall efficiency of your viral loops (quality ×
                    amplification × conversion)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Tab */}
        <TabsContent value="seasonal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Seasonal Multipliers Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Wedding Season Impact</CardTitle>
                <CardDescription>Viral coefficient by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="multiplier">
                      {seasonalData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={seasonalColors[index]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Current Season Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Current Season Analysis</CardTitle>
                <CardDescription>
                  Wedding season impact on viral growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900">
                      Current Multiplier
                    </h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {enhanced.weddingSeasonMultiplier.toFixed(2)}x
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      {enhanced.weddingSeasonMultiplier > 1.2
                        ? 'Peak wedding season - high viral potential'
                        : enhanced.weddingSeasonMultiplier > 1.0
                          ? 'Shoulder season - moderate viral activity'
                          : 'Off-season - consider targeted campaigns'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center p-3 border rounded">
                      <span className="font-medium">Peak Season</span>
                      <Badge className="bg-green-100 text-green-800">
                        {metrics.seasonal?.peakSeason.multiplier.toFixed(1)}x
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded">
                      <span className="font-medium">Off Season</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {metrics.seasonal?.offSeason.multiplier.toFixed(1)}x
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Simulation Presets */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Simulation Presets</CardTitle>
                <CardDescription>Quick scenarios to test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(simulationPresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => handleRunSimulation(preset)}
                    disabled={simulation.isRunning}
                  >
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {preset.duration} days • £{preset.cost}
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Simulation Results */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Simulation Results</CardTitle>
                <CardDescription>
                  {selectedSimulation
                    ? `Results for: ${selectedSimulation.name}`
                    : 'Select a simulation to run'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {simulation.isRunning ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <span className="ml-2">Running simulation...</span>
                  </div>
                ) : simulation.result ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <div className="text-sm text-gray-600">
                          Projected Coefficient
                        </div>
                        <div className="text-2xl font-bold">
                          {simulation.result.projectedCoefficient.toFixed(3)}
                        </div>
                        <div className="text-xs">
                          vs current:{' '}
                          {simulation.result.currentCoefficient.toFixed(3)}
                        </div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm text-gray-600">User Growth</div>
                        <div className="text-2xl font-bold">
                          {simulation.result.userGrowthImpact.toFixed(1)}%
                        </div>
                        <div className="text-xs">
                          +{simulation.result.detailedMetrics.additionalUsers}{' '}
                          users
                        </div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm text-gray-600">
                          Revenue Impact
                        </div>
                        <div className="text-2xl font-bold">
                          £{simulation.result.revenueImpact.toFixed(0)}
                        </div>
                        <div className="text-xs">
                          ROI:{' '}
                          {(
                            simulation.result.detailedMetrics
                              .returnOnInvestment * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm text-gray-600">Break Even</div>
                        <div className="text-2xl font-bold">
                          {simulation.result.breakEvenDays}d
                        </div>
                        <div className="text-xs">
                          Confidence:{' '}
                          {(simulation.result.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {simulation.result.detailedMetrics.riskFactors.length >
                      0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h5 className="font-medium text-yellow-800 mb-2">
                          Risk Factors
                        </h5>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {simulation.result.detailedMetrics.riskFactors.map(
                            (risk, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                {risk}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                    Select a simulation preset to see projected results
                  </div>
                )}

                {simulation.error && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{simulation.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bottlenecks */}
            <Card>
              <CardHeader>
                <CardTitle>Viral Bottlenecks</CardTitle>
                <CardDescription>Areas limiting viral growth</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.bottlenecks.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.bottlenecks
                      .slice(0, 3)
                      .map((bottleneck, index) => (
                        <div
                          key={bottleneck.stage}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium capitalize">
                              {bottleneck.stage}
                            </h4>
                            <Badge
                              variant={
                                bottleneck.impact > 0.3
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {(bottleneck.impact * 100).toFixed(0)}% impact
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {bottleneck.description}
                          </p>
                          <p className="text-sm font-medium">
                            {bottleneck.recommendation}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            Improvement potential:{' '}
                            {(
                              bottleneck.estimatedImprovementPotential * 100
                            ).toFixed(0)}
                            %
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No major bottlenecks detected. Your viral system is
                    performing well!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  Prioritized actions to improve virality
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <Badge
                            variant={
                              rec.priority === 'high'
                                ? 'default'
                                : rec.priority === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {rec.priority} priority
                          </Badge>
                          <span className="text-sm font-mono">
                            ROI: {rec.roi.toFixed(1)}x
                          </span>
                        </div>
                        <h4 className="font-medium mb-2">
                          {rec.category.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {rec.action}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Impact: {(rec.expectedImpact * 100).toFixed(0)}%
                          </span>
                          <span>Effort: {rec.implementationEffort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Your viral system is optimized. Keep monitoring for new
                    opportunities!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
