'use client';

// FAQ Extraction Dashboard Component - Overview and management interface
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Component: Manual Review Interface Dashboard

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Filter,
  DownloadCloud,
  Settings,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  faqExtractionService,
  type ExtractionResult,
  type DocumentAnalysis,
} from '@/lib/services/faq-extraction-service';
import FAQExtractionReview from './FAQExtractionReview';

interface FAQExtractionDashboardProps {
  supplier_id: string;
  className?: string;
}

interface ExtractionSession {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed';
  documents_processed: number;
  faqs_extracted: number;
  high_confidence: number;
  accuracy_estimate: number;
  created_at: string;
  processing_time_ms?: number;
}

interface DashboardMetrics {
  total_extractions: number;
  pending_reviews: number;
  approved_extractions: number;
  rejected_extractions: number;
  avg_confidence: number;
  accuracy_rate: number;
  processing_time_avg: number;
  category_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  recent_activity: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

export default function FAQExtractionDashboard({
  supplier_id,
  className,
}: FAQExtractionDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sessions, setSessions] = useState<ExtractionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [processingDocuments, setProcessingDocuments] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [supplier_id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would load this data from the backend
      // For now, we'll use mock data
      const mockMetrics: DashboardMetrics = {
        total_extractions: 156,
        pending_reviews: 23,
        approved_extractions: 98,
        rejected_extractions: 35,
        avg_confidence: 0.78,
        accuracy_rate: 0.82,
        processing_time_avg: 2400,
        category_distribution: [
          { category: 'booking-pricing', count: 45, percentage: 29 },
          { category: 'timeline-delivery', count: 32, percentage: 21 },
          { category: 'photography-process', count: 28, percentage: 18 },
          { category: 'wedding-day-logistics', count: 24, percentage: 15 },
          { category: 'packages-addons', count: 18, percentage: 12 },
          { category: 'weather-backup', count: 6, percentage: 4 },
          { category: 'image-rights', count: 3, percentage: 2 },
        ],
        confidence_distribution: {
          high: 67,
          medium: 54,
          low: 35,
        },
        recent_activity: [
          {
            action: 'Batch Approved',
            timestamp: '2025-01-24T10:30:00Z',
            details: '12 FAQs approved from contract analysis',
          },
          {
            action: 'Document Processed',
            timestamp: '2025-01-24T09:15:00Z',
            details: 'Wedding package PDF - 8 FAQs extracted',
          },
          {
            action: 'Manual Review',
            timestamp: '2025-01-24T08:45:00Z',
            details: 'FAQ edited and approved by reviewer',
          },
        ],
      };
      setMetrics(mockMetrics);

      const mockSessions: ExtractionSession[] = [
        {
          id: '1',
          name: 'Wedding Contract Analysis - Batch 3',
          status: 'completed',
          documents_processed: 5,
          faqs_extracted: 23,
          high_confidence: 18,
          accuracy_estimate: 0.85,
          created_at: '2025-01-24T09:00:00Z',
          processing_time_ms: 45000,
        },
        {
          id: '2',
          name: 'Service Guide Processing',
          status: 'processing',
          documents_processed: 2,
          faqs_extracted: 8,
          high_confidence: 6,
          accuracy_estimate: 0.8,
          created_at: '2025-01-24T10:15:00Z',
        },
      ];
      setSessions(mockSessions);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      setProcessingDocuments(true);
      setSelectedFiles(files);

      // Convert files to document analyses
      const documentAnalyses: DocumentAnalysis[] = await Promise.all(
        files.map(async (file) => {
          // In a real implementation, you'd extract text from PDF/documents here
          return {
            content: `Mock extracted content from ${file.name}`,
            document_type: determineDocumentType(file.name),
            source_file: file.name,
          };
        }),
      );

      // Process documents for FAQ extraction
      const result =
        await faqExtractionService.batchExtractFaqs(documentAnalyses);

      // Store results for review
      for (const extractionResult of result.results) {
        await faqExtractionService.storeForReview(
          extractionResult,
          supplier_id,
        );
      }

      // Refresh dashboard data
      await loadDashboardData();
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Failed to process documents:', error);
    } finally {
      setProcessingDocuments(false);
    }
  };

  const determineDocumentType = (
    filename: string,
  ): DocumentAnalysis['document_type'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('service') || lower.includes('guide'))
      return 'service_guide';
    if (lower.includes('vendor') || lower.includes('info'))
      return 'vendor_info';
    if (lower.includes('email')) return 'email_thread';
    if (lower.includes('inquiry') || lower.includes('question'))
      return 'client_inquiry';
    return 'other';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">FAQ Extraction Dashboard</h2>
          <p className="text-muted-foreground">
            Manage AI-powered FAQ extraction from documents
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Documents for FAQ Extraction</DialogTitle>
              </DialogHeader>
              <DocumentUploadForm
                onUpload={handleFileUpload}
                processing={processingDocuments}
              />
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Extractions
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.total_extractions}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500">+12%</span>
                <span className="text-muted-foreground ml-1">
                  from last week
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Reviews
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.pending_reviews}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />
                <span className="text-yellow-500">Needs attention</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Accuracy Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(metrics.accuracy_rate * 100)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <Progress value={metrics.accuracy_rate * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Processing
                  </p>
                  <p className="text-2xl font-bold">
                    {formatTime(metrics.processing_time_avg)}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <span>Fast processing</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="review">Review Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.category_distribution.map((cat, index) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: `hsl(${index * 45}, 70%, 60%)`,
                          }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {cat.category.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {cat.count}
                        </span>
                        <Badge variant="secondary">{cat.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Confidence Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Confidence Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      High Confidence (85%+)
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {metrics?.confidence_distribution.high}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (metrics?.confidence_distribution.high /
                        (metrics?.total_extractions || 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Medium Confidence (65-84%)
                    </span>
                    <Badge variant="secondary">
                      {metrics?.confidence_distribution.medium}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (metrics?.confidence_distribution.medium /
                        (metrics?.total_extractions || 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Low Confidence (&lt;65%)
                    </span>
                    <Badge variant="destructive">
                      {metrics?.confidence_distribution.low}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (metrics?.confidence_distribution.low /
                        (metrics?.total_extractions || 1)) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <FAQExtractionReview
            supplier_id={supplier_id}
            onReviewComplete={(approved, rejected) => {
              console.log(
                `Reviewed: ${approved} approved, ${rejected} rejected`,
              );
              loadDashboardData(); // Refresh metrics
            }}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Detailed Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced analytics and insights coming soon
                </p>
                <Button variant="outline">Request Analytics Features</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Extraction Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{session.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{session.documents_processed} documents</span>
                            <span>{session.faqs_extracted} FAQs extracted</span>
                            <span>
                              {session.high_confidence} high confidence
                            </span>
                            {session.processing_time_ms && (
                              <span>
                                {formatTime(session.processing_time_ms)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              session.status === 'completed'
                                ? 'default'
                                : session.status === 'processing'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {session.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Document Upload Form Component
interface DocumentUploadFormProps {
  onUpload: (files: File[]) => void;
  processing: boolean;
}

function DocumentUploadForm({ onUpload, processing }: DocumentUploadFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files).filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.type.startsWith('text/') ||
          file.name.endsWith('.docx'),
      );
      setSelectedFiles(fileArray);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25',
          'hover:border-primary hover:bg-primary/5',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          Drop files here or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOCX, and text files supported
        </p>
        <Input
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="mt-2"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files ({selectedFiles.length})</Label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm p-2 bg-muted rounded"
              >
                <span className="truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSubmit}
          disabled={selectedFiles.length === 0 || processing}
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 mr-2" />
              Extract FAQs
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
