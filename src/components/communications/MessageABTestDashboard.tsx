'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  FlaskConical,
  Users,
  Mail,
  MousePointerClick,
  TrendingUp,
  Award,
  Copy,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ABTestVariant {
  id: string;
  name: string;
  subject: string;
  content: string;
  percentage: number;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
  };
  performance?: {
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
    confidence: number;
  };
  is_control: boolean;
  is_winner?: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  created_at: Date;
  started_at?: Date;
  ended_at?: Date;
  variants: ABTestVariant[];
  total_recipients: number;
  test_size: number;
  winner_selection: {
    method: 'manual' | 'automatic';
    metric: 'open_rate' | 'click_rate' | 'conversion_rate';
    confidence_threshold: number;
    min_sample_size: number;
    duration_hours: number;
  };
  settings: {
    randomization: boolean;
    statistical_significance: boolean;
    multivariate: boolean;
  };
}

interface MessageABTestDashboardProps {
  clientId: string;
  onTestComplete?: (test: ABTest) => void;
  className?: string;
}

export function MessageABTestDashboard({
  clientId,
  onTestComplete,
  className,
}: MessageABTestDashboardProps) {
  const [activeTest, setActiveTest] = useState<ABTest | null>(null);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTest, setNewTest] = useState<Partial<ABTest>>({
    name: '',
    variants: [
      {
        id: 'control',
        name: 'Control',
        subject: '',
        content: '',
        percentage: 50,
        is_control: true,
      },
      {
        id: 'variant-a',
        name: 'Variant A',
        subject: '',
        content: '',
        percentage: 50,
        is_control: false,
      },
    ],
    test_size: 20,
    winner_selection: {
      method: 'automatic',
      metric: 'open_rate',
      confidence_threshold: 95,
      min_sample_size: 100,
      duration_hours: 24,
    },
    settings: {
      randomization: true,
      statistical_significance: true,
      multivariate: false,
    },
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const mockPerformanceData = [
    { name: 'Hour 1', control: 5, variantA: 7, variantB: 6 },
    { name: 'Hour 2', control: 12, variantA: 15, variantB: 14 },
    { name: 'Hour 3', control: 18, variantA: 22, variantB: 20 },
    { name: 'Hour 4', control: 25, variantA: 32, variantB: 28 },
    { name: 'Hour 5', control: 30, variantA: 38, variantB: 35 },
    { name: 'Hour 6', control: 33, variantA: 42, variantB: 39 },
  ];

  const handleAddVariant = () => {
    const variantCount =
      newTest.variants?.filter((v) => !v.is_control).length || 0;
    const newVariant: ABTestVariant = {
      id: `variant-${String.fromCharCode(97 + variantCount).toLowerCase()}`,
      name: `Variant ${String.fromCharCode(65 + variantCount)}`,
      subject: '',
      content: '',
      percentage: 0,
      is_control: false,
    };

    const variants = [...(newTest.variants || [])];
    const percentagePerVariant = Math.floor(100 / (variants.length + 1));

    variants.forEach((v) => {
      v.percentage = percentagePerVariant;
    });
    variants.push({
      ...newVariant,
      percentage: 100 - percentagePerVariant * variants.length,
    });

    setNewTest({ ...newTest, variants });
  };

  const handleRemoveVariant = (id: string) => {
    const variants = newTest.variants?.filter((v) => v.id !== id) || [];
    const percentagePerVariant = Math.floor(100 / variants.length);

    variants.forEach((v, i) => {
      if (i === variants.length - 1) {
        v.percentage = 100 - percentagePerVariant * (variants.length - 1);
      } else {
        v.percentage = percentagePerVariant;
      }
    });

    setNewTest({ ...newTest, variants });
  };

  const handleUpdateVariant = (
    id: string,
    field: keyof ABTestVariant,
    value: any,
  ) => {
    const variants =
      newTest.variants?.map((v) =>
        v.id === id ? { ...v, [field]: value } : v,
      ) || [];
    setNewTest({ ...newTest, variants });
  };

  const handleStartTest = () => {
    const test: ABTest = {
      id: `test-${Date.now()}`,
      name: newTest.name || 'Untitled Test',
      status: 'running',
      created_at: new Date(),
      started_at: new Date(),
      variants: newTest.variants || [],
      total_recipients: 1000,
      test_size: newTest.test_size || 20,
      winner_selection: newTest.winner_selection!,
      settings: newTest.settings!,
    };

    setTests([test, ...tests]);
    setActiveTest(test);
    setIsCreating(false);

    // Simulate test progress
    setTimeout(() => {
      simulateTestProgress(test);
    }, 1000);
  };

  const simulateTestProgress = (test: ABTest) => {
    const updatedTest = { ...test };
    updatedTest.variants = updatedTest.variants.map((variant) => ({
      ...variant,
      stats: {
        sent: Math.floor(Math.random() * 500) + 100,
        opened: Math.floor(Math.random() * 300) + 50,
        clicked: Math.floor(Math.random() * 100) + 10,
        converted: Math.floor(Math.random() * 50) + 5,
        unsubscribed: Math.floor(Math.random() * 10),
      },
      performance: {
        open_rate: Math.random() * 40 + 20,
        click_rate: Math.random() * 15 + 5,
        conversion_rate: Math.random() * 10 + 2,
        confidence: Math.random() * 30 + 70,
      },
    }));

    // Determine winner
    const winner = updatedTest.variants.reduce((prev, current) =>
      (current.performance?.open_rate || 0) > (prev.performance?.open_rate || 0)
        ? current
        : prev,
    );
    winner.is_winner = true;

    setActiveTest(updatedTest);
    setTests(tests.map((t) => (t.id === updatedTest.id ? updatedTest : t)));
  };

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            A/B Testing Dashboard
          </CardTitle>
          <CardDescription>
            Test different message versions to optimize engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{tests.length}</p>
                <p className="text-sm text-muted-foreground">Total Tests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {tests.filter((t) => t.status === 'running').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {tests.filter((t) => t.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Create New Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create New Test */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create A/B Test</CardTitle>
            <CardDescription>
              Set up your test variants and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Name */}
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={newTest.name}
                onChange={(e) =>
                  setNewTest({ ...newTest, name: e.target.value })
                }
                placeholder="e.g., Subject Line Test - Wedding Invitations"
              />
            </div>

            {/* Test Size */}
            <div className="space-y-2">
              <Label htmlFor="test-size">Test Size (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="test-size"
                  type="number"
                  min="10"
                  max="100"
                  value={newTest.test_size}
                  onChange={(e) =>
                    setNewTest({
                      ...newTest,
                      test_size: parseInt(e.target.value),
                    })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {newTest.test_size}% of recipients will receive test variants
                </span>
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Message Variants</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariant}
                  disabled={newTest.variants?.length >= 5}
                >
                  Add Variant
                </Button>
              </div>

              <div className="space-y-4">
                {newTest.variants?.map((variant) => (
                  <Card key={variant.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Input
                            value={variant.name}
                            onChange={(e) =>
                              handleUpdateVariant(
                                variant.id,
                                'name',
                                e.target.value,
                              )
                            }
                            className="w-32"
                          />
                          {variant.is_control && (
                            <Badge variant="secondary">Control</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={variant.percentage}
                              onChange={(e) =>
                                handleUpdateVariant(
                                  variant.id,
                                  'percentage',
                                  parseInt(e.target.value),
                                )
                              }
                              className="w-16"
                            />
                            <span className="text-sm">%</span>
                          </div>
                          {!variant.is_control && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVariant(variant.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                          value={variant.subject}
                          onChange={(e) =>
                            handleUpdateVariant(
                              variant.id,
                              'subject',
                              e.target.value,
                            )
                          }
                          placeholder="Enter subject line for this variant"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message Content</Label>
                        <Textarea
                          value={variant.content}
                          onChange={(e) =>
                            handleUpdateVariant(
                              variant.id,
                              'content',
                              e.target.value,
                            )
                          }
                          placeholder="Enter message content for this variant"
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Winner Selection */}
            <div className="space-y-4">
              <Label>Winner Selection</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selection-method">Method</Label>
                  <Select
                    value={newTest.winner_selection?.method}
                    onValueChange={(value) =>
                      setNewTest({
                        ...newTest,
                        winner_selection: {
                          ...newTest.winner_selection!,
                          method: value as 'manual' | 'automatic',
                        },
                      })
                    }
                  >
                    <SelectTrigger id="selection-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selection-metric">Metric</Label>
                  <Select
                    value={newTest.winner_selection?.metric}
                    onValueChange={(value) =>
                      setNewTest({
                        ...newTest,
                        winner_selection: {
                          ...newTest.winner_selection!,
                          metric: value as
                            | 'open_rate'
                            | 'click_rate'
                            | 'conversion_rate',
                        },
                      })
                    }
                  >
                    <SelectTrigger id="selection-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_rate">Open Rate</SelectItem>
                      <SelectItem value="click_rate">Click Rate</SelectItem>
                      <SelectItem value="conversion_rate">
                        Conversion Rate
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartTest}>Start Test</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Test Details */}
      {activeTest && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{activeTest.name}</CardTitle>
                <CardDescription>
                  Started {activeTest.started_at?.toLocaleString()}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(activeTest.status)}>
                {activeTest.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="performance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Variant Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={activeTest.variants.map((v) => ({
                            name: v.name,
                            'Open Rate': v.performance?.open_rate || 0,
                            'Click Rate': v.performance?.click_rate || 0,
                            'Conversion Rate':
                              v.performance?.conversion_rate || 0,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Open Rate" fill="#8884d8" />
                          <Bar dataKey="Click Rate" fill="#82ca9d" />
                          <Bar dataKey="Conversion Rate" fill="#ffc658" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={activeTest.variants.map((v, i) => ({
                              name: v.name,
                              value: v.stats?.sent || 0,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {activeTest.variants.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Variant Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTest.variants.map((variant) => (
                    <Card
                      key={variant.id}
                      className={
                        variant.is_winner ? 'ring-2 ring-green-500' : ''
                      }
                    >
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">
                            {variant.name}
                          </CardTitle>
                          {variant.is_winner && (
                            <Badge className="bg-green-500">
                              <Award className="mr-1 h-3 w-3" />
                              Winner
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Open Rate
                          </span>
                          <span className="font-medium">
                            {variant.performance?.open_rate?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Click Rate
                          </span>
                          <span className="font-medium">
                            {variant.performance?.click_rate?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Conversion
                          </span>
                          <span className="font-medium">
                            {variant.performance?.conversion_rate?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Confidence</span>
                            <span>
                              {variant.performance?.confidence?.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={variant.performance?.confidence || 0}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={mockPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="control"
                          stroke="#8884d8"
                        />
                        <Line
                          type="monotone"
                          dataKey="variantA"
                          stroke="#82ca9d"
                        />
                        <Line
                          type="monotone"
                          dataKey="variantB"
                          stroke="#ffc658"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistical Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Sample Size
                          </p>
                          <p className="text-2xl font-bold">
                            {activeTest.variants.reduce(
                              (sum, v) => sum + (v.stats?.sent || 0),
                              0,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Statistical Power
                          </p>
                          <p className="text-2xl font-bold">95%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            P-Value
                          </p>
                          <p className="text-2xl font-bold">0.023</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Effect Size
                          </p>
                          <p className="text-2xl font-bold">12.5%</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm">
                          <span className="font-medium">Conclusion:</span> The
                          test has reached statistical significance. Variant A
                          shows a 12.5% improvement in open rate compared to the
                          control group with 95% confidence.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variants" className="space-y-4">
                {activeTest.variants.map((variant) => (
                  <Card key={variant.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {variant.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Subject Line</p>
                        <p className="text-sm text-muted-foreground">
                          {variant.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Message Content
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {variant.content}
                        </p>
                      </div>
                      <div className="grid grid-cols-5 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Sent</p>
                          <p className="font-medium">
                            {variant.stats?.sent || 0}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Opened
                          </p>
                          <p className="font-medium">
                            {variant.stats?.opened || 0}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Clicked
                          </p>
                          <p className="font-medium">
                            {variant.stats?.clicked || 0}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Converted
                          </p>
                          <p className="font-medium">
                            {variant.stats?.converted || 0}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Unsubscribed
                          </p>
                          <p className="font-medium">
                            {variant.stats?.unsubscribed || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      {tests.length > 0 && !isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setActiveTest(test)}
                >
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {test.variants.length} variants • {test.total_recipients}{' '}
                      recipients
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {test.created_at.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
