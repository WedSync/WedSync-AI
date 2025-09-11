'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  FlaskConical,
  Play,
  Pause,
  StopCircle,
  Trophy,
  TrendingUp,
  AlertCircle,
  Plus,
  ChevronRight,
} from 'lucide-react';

const abTestSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  testName: z.string().min(3, 'Test name must be at least 3 characters'),
  testType: z.enum(['pricing', 'description', 'title', 'screenshots']),
  controlPrice: z.number().optional(),
  testPrice: z.number().optional(),
  controlTitle: z.string().optional(),
  testTitle: z.string().optional(),
  controlDescription: z.string().optional(),
  testDescription: z.string().optional(),
  trafficAllocation: z.number().min(0.1).max(0.9),
  duration: z.number().min(1).max(90),
  minimumSampleSize: z.number().min(10).max(10000),
});

type ABTestFormData = z.infer<typeof abTestSchema>;

export default function ABTestManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const queryClient = useQueryClient();

  const form = useForm<ABTestFormData>({
    resolver: zodResolver(abTestSchema),
    defaultValues: {
      trafficAllocation: 0.5,
      duration: 14,
      minimumSampleSize: 100,
    },
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const response = await fetch(
        '/api/marketplace/creator/analytics/ab-tests',
      );
      if (!response.ok) throw new Error('Failed to fetch A/B tests');
      return response.json();
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['creator-templates'],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/templates/mine');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: ABTestFormData) => {
      const controlVariant: any = {};
      const testVariant: any = {};

      if (data.testType === 'pricing') {
        controlVariant.price = data.controlPrice! * 100; // Convert to cents
        testVariant.price = data.testPrice! * 100;
      } else if (data.testType === 'title') {
        controlVariant.title = data.controlTitle;
        testVariant.title = data.testTitle;
      } else if (data.testType === 'description') {
        controlVariant.description = data.controlDescription;
        testVariant.description = data.testDescription;
      }

      const response = await fetch(
        '/api/marketplace/creator/analytics/ab-tests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: data.templateId,
            testName: data.testName,
            testType: data.testType,
            controlVariant,
            testVariant,
            trafficAllocation: data.trafficAllocation,
            duration: data.duration,
            minimumSampleSize: data.minimumSampleSize,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to create A/B test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({
      testId,
      action,
    }: {
      testId: string;
      action: string;
    }) => {
      const response = await fetch(
        '/api/marketplace/creator/analytics/ab-tests',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, action }),
        },
      );

      if (!response.ok) throw new Error('Failed to update A/B test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'success';
      case 'stopped':
        return 'destructive';
      case 'paused':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getConfidenceLevel = (test: any) => {
    if (test.status !== 'running' && test.status !== 'completed') return null;

    const confidence = test.pValue ? (1 - test.pValue) * 100 : 0;
    return confidence;
  };

  const onSubmit = (data: ABTestFormData) => {
    createTestMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <p>Loading A/B tests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">A/B Testing</h2>
          <p className="text-sm text-muted-foreground">
            Test and optimize your templates
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Test different variations of your template to optimize
                performance
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates?.map((template: any) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Price Reduction Test"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="What do you want to test?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pricing">Pricing</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="description">
                            Description
                          </SelectItem>
                          <SelectItem value="screenshots">
                            Screenshots
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('testType') === 'pricing' && (
                  <>
                    <FormField
                      control={form.control}
                      name="controlPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Current price"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="testPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="New price to test"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="trafficAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Traffic Allocation</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={0.1}
                            max={0.9}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            className="flex-1"
                          />
                          <span className="w-12 text-sm font-medium">
                            {Math.round(field.value * 100)}%
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Percentage of traffic to send to test variant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createTestMutation.isPending}
                  >
                    {createTestMutation.isPending
                      ? 'Creating...'
                      : 'Create Test'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tests */}
      {tests?.filter((t: any) => t.status === 'running').length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Active Tests</h3>
          <div className="grid gap-4">
            {tests
              .filter((test: any) => test.status === 'running')
              .map((test: any) => (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {test.test_name}
                        </CardTitle>
                        <CardDescription>
                          {test.marketplace_templates?.title} • {test.test_type}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(test.status) as any}>
                        {test.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Sample Size Progress</span>
                          <span>
                            {test.control_visitors + test.test_visitors} /{' '}
                            {test.minimum_sample_size * 2}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((test.control_visitors + test.test_visitors) /
                              (test.minimum_sample_size * 2)) *
                            100
                          }
                          className="h-2"
                        />
                      </div>

                      {/* Results */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Control</p>
                          <p className="text-2xl font-bold">
                            {test.controlConversionRate
                              ? `${(test.controlConversionRate * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {test.control_conversions} / {test.control_visitors}{' '}
                            conversions
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Test Variant</p>
                          <p className="text-2xl font-bold">
                            {test.testConversionRate
                              ? `${(test.testConversionRate * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {test.test_conversions} / {test.test_visitors}{' '}
                            conversions
                          </p>
                        </div>
                      </div>

                      {/* Uplift */}
                      {test.uplift !== undefined && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Uplift</span>
                          <div className="flex items-center gap-2">
                            {test.uplift > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                            )}
                            <span
                              className={`font-bold ${test.uplift > 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {test.uplift > 0 ? '+' : ''}
                              {test.uplift.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Statistical Significance */}
                      {test.isSignificant !== undefined && (
                        <div className="flex items-center gap-2">
                          {test.isSignificant ? (
                            <>
                              <Trophy className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">
                                Statistically significant!
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm text-muted-foreground">
                                Not yet significant (p={test.pValue?.toFixed(3)}
                                )
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateTestMutation.mutate({
                              testId: test.id,
                              action: 'pause',
                            })
                          }
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            updateTestMutation.mutate({
                              testId: test.id,
                              action: 'stop',
                            })
                          }
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                        {test.hasEnoughData && test.isSignificant && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              updateTestMutation.mutate({
                                testId: test.id,
                                action: 'complete',
                              })
                            }
                          >
                            Complete Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Completed Tests */}
      {tests?.filter((t: any) => t.status === 'completed').length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Completed Tests</h3>
          <div className="grid gap-4">
            {tests
              .filter((test: any) => test.status === 'completed')
              .map((test: any) => (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {test.test_name}
                        </CardTitle>
                        <CardDescription>
                          {test.marketplace_templates?.title} • Completed{' '}
                          {new Date(test.completed_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {test.winner && test.winner !== 'none' && (
                        <Badge variant="success" className="gap-1">
                          <Trophy className="h-3 w-3" />
                          {test.winner === 'test' ? 'Test Won' : 'Control Won'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Confidence Level
                        </p>
                        <p className="font-medium">
                          {test.confidence_level
                            ? `${(test.confidence_level * 100).toFixed(1)}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!tests || tests.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold mb-2">No A/B Tests Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start testing different variations to optimize your templates
            </p>
            <Button
              variant="primary"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
