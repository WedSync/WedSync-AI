'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  DollarSign,
  Play,
  Pause,
  SkipForward,
  TrendingDown,
  Camera,
  FileText,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Timer,
  Zap,
} from 'lucide-react';
import type { BatchProcessingJob } from '@/types/ai-optimization';

interface BatchProcessingSchedulerProps {
  organizationId: string;
  jobs?: BatchProcessingJob[];
  onScheduleJob: (job: Partial<BatchProcessingJob>) => void;
  onCancelJob: (jobId: string) => void;
  onRescheduleJob: (jobId: string, newSchedule: string) => void;
  className?: string;
}

// Mock data for development
const mockJobs: BatchProcessingJob[] = [
  {
    id: 'batch-1',
    type: 'photo_processing',
    status: 'queued',
    priority: 'normal',
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    createdAt: new Date().toISOString(),
    estimatedCostPence: 480, // £4.80
    costSavingsVsImmediate: 120, // £1.20 savings
    weddingId: 'wedding-123',
    clientId: 'client-456',
    isClientFacing: false,
    items: 25,
    processedItems: 0,
    failedItems: 0,
    metadata: {
      weddingDate: '2025-06-15',
      service: 'Photo AI tagging and categorization',
      photographer: 'Capture Moments Studio',
    },
  },
  {
    id: 'batch-2',
    type: 'content_generation',
    status: 'processing',
    priority: 'high',
    scheduledFor: new Date().toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    estimatedCostPence: 320,
    actualCostPence: 280,
    costSavingsVsImmediate: 40,
    isClientFacing: true,
    items: 12,
    processedItems: 8,
    failedItems: 0,
    metadata: {
      service: 'Wedding invitation templates',
      clientEmail: 'sarah.john@email.com',
    },
  },
  {
    id: 'batch-3',
    type: 'email_batch',
    status: 'completed',
    priority: 'low',
    scheduledFor: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    estimatedCostPence: 200,
    actualCostPence: 180,
    costSavingsVsImmediate: 60,
    isClientFacing: false,
    items: 50,
    processedItems: 50,
    failedItems: 0,
    metadata: {
      service: 'Monthly newsletter to past clients',
    },
  },
];

const getJobTypeIcon = (type: BatchProcessingJob['type']) => {
  switch (type) {
    case 'photo_processing':
      return Camera;
    case 'content_generation':
      return FileText;
    case 'email_batch':
      return MessageCircle;
    default:
      return FileText;
  }
};

const getStatusColor = (status: BatchProcessingJob['status']) => {
  switch (status) {
    case 'queued':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: BatchProcessingJob['priority']) => {
  switch (priority) {
    case 'low':
      return 'bg-gray-100 text-gray-800';
    case 'normal':
      return 'bg-blue-100 text-blue-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function BatchProcessingScheduler({
  organizationId,
  jobs = mockJobs,
  onScheduleJob,
  onCancelJob,
  onRescheduleJob,
  className = '',
}: BatchProcessingSchedulerProps) {
  const [selectedTab, setSelectedTab] = useState('active');
  const [autoScheduling, setAutoScheduling] = useState(true);
  const [offPeakHours, setOffPeakHours] = useState('22:00');
  const [batchSize, setBatchSize] = useState('medium');

  const activeJobs = jobs.filter((job) =>
    ['queued', 'processing'].includes(job.status),
  );
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const failedJobs = jobs.filter((job) => job.status === 'failed');

  const totalSavings = jobs.reduce(
    (sum, job) => sum + job.costSavingsVsImmediate,
    0,
  );
  const totalProcessed = jobs.reduce((sum, job) => sum + job.processedItems, 0);

  const handleScheduleNewJob = () => {
    const newJob: Partial<BatchProcessingJob> = {
      type: 'photo_processing',
      priority: 'normal',
      scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      isClientFacing: false,
      items: 20,
      metadata: {
        service: 'New photo processing job',
      },
    };
    onScheduleJob(newJob);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Batch Processing Scheduler
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule AI operations for off-peak hours to save on costs
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                £{(totalSavings / 100).toFixed(2)} saved
              </Badge>
              <Button onClick={handleScheduleNewJob} size="sm">
                Schedule Job
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Auto-Scheduling Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-scheduling">Auto-Schedule</Label>
                <Switch
                  id="auto-scheduling"
                  checked={autoScheduling}
                  onCheckedChange={setAutoScheduling}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="off-peak-hours">Off-Peak Hours</Label>
                <Select value={offPeakHours} onValueChange={setOffPeakHours}>
                  <SelectTrigger id="off-peak-hours">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22:00">10:00 PM - 6:00 AM</SelectItem>
                    <SelectItem value="23:00">11:00 PM - 7:00 AM</SelectItem>
                    <SelectItem value="00:00">12:00 AM - 8:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Batch Size Settings */}
            <div className="space-y-4">
              <Label>Default Batch Size</Label>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (10-25 items)</SelectItem>
                  <SelectItem value="medium">Medium (25-50 items)</SelectItem>
                  <SelectItem value="large">Large (50-100 items)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Larger batches save more but take longer to process
              </p>
            </div>

            {/* Cost Savings Summary */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Cost Optimization</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Items Processed:</span>
                  <span className="font-medium">{totalProcessed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Savings:</span>
                  <span className="font-medium text-green-600">
                    £{(totalSavings / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg per Item:</span>
                  <span className="font-medium">
                    £
                    {totalProcessed > 0
                      ? (totalSavings / totalProcessed / 100).toFixed(3)
                      : '0.000'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Queue Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimization
          </TabsTrigger>
        </TabsList>

        {/* Active Jobs */}
        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Timer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Active Jobs</h3>
                <p className="text-muted-foreground">
                  All AI operations are up to date. Schedule a job to optimize
                  costs.
                </p>
                <Button onClick={handleScheduleNewJob} className="mt-4">
                  Schedule New Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => {
              const IconComponent = getJobTypeIcon(job.type);
              const progress =
                job.items > 0 ? (job.processedItems / job.items) * 100 : 0;

              return (
                <Card key={job.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {job.metadata.service || job.type.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {job.metadata.photographer &&
                              `${job.metadata.photographer} • `}
                            {job.items} items • Scheduled{' '}
                            {new Date(job.scheduledFor).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>
                            {job.processedItems}/{job.items}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">
                          Cost Savings
                        </div>
                        <div className="font-medium text-green-600">
                          £{(job.costSavingsVsImmediate / 100).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Estimated Cost
                        </div>
                        <div className="font-medium">
                          £{(job.estimatedCostPence / 100).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Wedding Date
                        </div>
                        <div className="font-medium">
                          {job.metadata.weddingDate
                            ? new Date(
                                job.metadata.weddingDate,
                              ).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onRescheduleJob(
                            job.id,
                            new Date(
                              Date.now() + 1 * 60 * 60 * 1000,
                            ).toISOString(),
                          )
                        }
                      >
                        <SkipForward className="h-4 w-4 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelJob(job.id)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Completed Jobs */}
        <TabsContent value="completed" className="space-y-4">
          {completedJobs.map((job) => {
            const IconComponent = getJobTypeIcon(job.type);

            return (
              <Card key={job.id} className="bg-green-50/30">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <IconComponent className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {job.metadata.service || job.type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Completed{' '}
                          {job.completedAt
                            ? new Date(job.completedAt).toLocaleString()
                            : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-semibold">
                        £{(job.costSavingsVsImmediate / 100).toFixed(2)} saved
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.processedItems} items processed
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Optimization Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing Optimization</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fine-tune when and how AI operations are batched for maximum
                cost savings
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wedding Season Optimization */}
              <div className="space-y-4">
                <h3 className="font-medium">Wedding Season Settings</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    During peak season (March-October), batching can reduce
                    costs by up to 40%. Non-urgent operations are automatically
                    scheduled for off-peak hours.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peak Season Batch Priority</Label>
                    <Select defaultValue="aggressive">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          Conservative (Save 20%)
                        </SelectItem>
                        <SelectItem value="balanced">
                          Balanced (Save 30%)
                        </SelectItem>
                        <SelectItem value="aggressive">
                          Aggressive (Save 40%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Client-Facing Priority</Label>
                    <Select defaultValue="high">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">
                          Process Immediately
                        </SelectItem>
                        <SelectItem value="high">
                          High Priority (2hr delay max)
                        </SelectItem>
                        <SelectItem value="normal">
                          Normal Priority (6hr delay)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cost Thresholds */}
              <div className="space-y-4">
                <h3 className="font-medium">Cost Optimization Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Batch Size for Savings</Label>
                    <Select defaultValue="10">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 items (15% savings)</SelectItem>
                        <SelectItem value="10">
                          10 items (25% savings)
                        </SelectItem>
                        <SelectItem value="25">
                          25 items (35% savings)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Delay for Non-Urgent</Label>
                    <Select defaultValue="12">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Save Optimization Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
