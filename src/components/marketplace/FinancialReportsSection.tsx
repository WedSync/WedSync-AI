'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText,
  Download,
  Calendar,
  Receipt,
  PieChart,
  BarChart,
  Mail,
  Check,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Calculator,
  TrendingUp,
} from 'lucide-react';

interface RevenueData {
  totalRevenue: number;
  totalCommissions: number;
  totalCreatorEarnings: number;
  templatesCount: number;
  creatorsCount: number;
  avgCommissionRate: number;
  topPerformingTemplates: Array<{
    id: string;
    title: string;
    revenue: number;
    sales: number;
    creator: string;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    commissions: number;
    creatorEarnings: number;
  }>;
}

interface TaxDocument {
  id: string;
  creatorId: string;
  creatorName: string;
  taxYear: number;
  documentType: string;
  totalEarnings: number;
  status: 'draft' | 'generated' | 'sent' | 'completed';
  generatedAt?: string;
  sentAt?: string;
  downloadUrl?: string;
}

interface Props {
  revenueData: RevenueData;
  timeframe: string;
}

export function FinancialReportsSection({ revenueData, timeframe }: Props) {
  const [reportType, setReportType] = useState('revenue');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState('current_month');
  const [loading, setLoading] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<
    'idle' | 'generating' | 'success' | 'error'
  >('idle');

  // Mock tax documents data
  const [taxDocuments] = useState<TaxDocument[]>([
    {
      id: '1',
      creatorId: '1',
      creatorName: 'Sarah Photography',
      taxYear: 2024,
      documentType: '1099-NEC',
      totalEarnings: 156700,
      status: 'completed',
      generatedAt: '2024-01-15',
      sentAt: '2024-01-15',
      downloadUrl: '/api/tax-docs/1099-sarah-2024.pdf',
    },
    {
      id: '2',
      creatorId: '2',
      creatorName: 'Elite Venues',
      taxYear: 2024,
      documentType: '1099-NEC',
      totalEarnings: 124500,
      status: 'sent',
      generatedAt: '2024-01-15',
      sentAt: '2024-01-16',
    },
    {
      id: '3',
      creatorId: '3',
      creatorName: 'Perfect Day Coordination',
      taxYear: 2024,
      documentType: '1099-NEC',
      totalEarnings: 87600,
      status: 'generated',
      generatedAt: '2024-01-15',
    },
  ]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleGenerateReport = async (type: string) => {
    setLoading(true);
    setGenerateStatus('generating');

    try {
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock download
      const reportData = {
        type,
        dateRange,
        format: exportFormat,
        data: revenueData,
      };

      console.log('Generated report:', reportData);
      setGenerateStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => setGenerateStatus('idle'), 3000);
    } catch (error) {
      setGenerateStatus('error');
      setTimeout(() => setGenerateStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTaxDocumentGeneration = async () => {
    setLoading(true);
    setGenerateStatus('generating');

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setGenerateStatus('success');
      setTimeout(() => setGenerateStatus('idle'), 3000);
    } catch (error) {
      setGenerateStatus('error');
      setTimeout(() => setGenerateStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'sent':
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'generated':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'generated':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports & Compliance</h2>
          <p className="text-gray-600">
            Generate reports and manage tax documentation
          </p>
        </div>

        {generateStatus !== 'idle' && (
          <Alert
            className={`w-auto ${
              generateStatus === 'success'
                ? 'border-green-200 bg-green-50'
                : generateStatus === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {generateStatus === 'generating' && (
                <Clock className="h-4 w-4 animate-spin" />
              )}
              {generateStatus === 'success' && (
                <Check className="h-4 w-4 text-green-600" />
              )}
              {generateStatus === 'error' && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {generateStatus === 'generating' && 'Generating report...'}
                {generateStatus === 'success' &&
                  'Report generated successfully'}
                {generateStatus === 'error' && 'Failed to generate report'}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Revenue Reports</TabsTrigger>
          <TabsTrigger value="tax">Tax Documents</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="exports">Data Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Financial Reports
                </CardTitle>
                <CardDescription>
                  Create detailed revenue and commission reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue Summary</SelectItem>
                        <SelectItem value="commission">
                          Commission Breakdown
                        </SelectItem>
                        <SelectItem value="creator">
                          Creator Earnings
                        </SelectItem>
                        <SelectItem value="template">
                          Template Performance
                        </SelectItem>
                        <SelectItem value="tax">Tax Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Export Format</Label>
                    <Select
                      value={exportFormat}
                      onValueChange={setExportFormat}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">
                        Current Month
                      </SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="last_quarter">Last Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => handleGenerateReport(reportType)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Quick Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Quick Reports
                </CardTitle>
                <CardDescription>
                  Pre-configured reports for common needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleGenerateReport('monthly_summary')}
                >
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Monthly Summary
                  </div>
                  <Badge variant="secondary">PDF</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleGenerateReport('creator_payouts')}
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Creator Payouts
                  </div>
                  <Badge variant="secondary">Excel</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleGenerateReport('commission_analysis')}
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Commission Analysis
                  </div>
                  <Badge variant="secondary">PDF</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleGenerateReport('performance_metrics')}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance Metrics
                  </div>
                  <Badge variant="secondary">Excel</Badge>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax">
          <div className="space-y-6">
            {/* Tax Document Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Tax Document Generation
                </CardTitle>
                <CardDescription>
                  Generate and manage 1099 forms and other tax documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <Label>Tax Year</Label>
                    <Select defaultValue="2024">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Document Type</Label>
                    <Select defaultValue="1099-nec">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1099-nec">1099-NEC</SelectItem>
                        <SelectItem value="1042-s">1042-S</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleTaxDocumentGeneration}
                    disabled={loading}
                    className="mt-6"
                  >
                    Generate All Documents
                  </Button>
                </div>

                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tax documents will be automatically generated for creators
                    earning over $600 in 2024.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {taxDocuments.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div>
                          <div className="font-semibold">{doc.creatorName}</div>
                          <div className="text-sm text-gray-500">
                            {doc.documentType}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="font-bold">{doc.taxYear}</div>
                          <div className="text-sm text-gray-500">Tax Year</div>
                        </div>

                        <div className="text-center">
                          <div className="font-semibold">
                            {formatCurrency(doc.totalEarnings)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Earnings
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <Badge className={getStatusBadgeColor(doc.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(doc.status)}
                              {doc.status}
                            </div>
                          </Badge>
                        </div>

                        <div className="text-center text-sm text-gray-500">
                          {doc.generatedAt && (
                            <div>Generated: {formatDate(doc.generatedAt)}</div>
                          )}
                          {doc.sentAt && (
                            <div>Sent: {formatDate(doc.sentAt)}</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {doc.status === 'generated' && (
                            <Button size="sm" variant="outline">
                              <Mail className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {doc.downloadUrl && (
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Financial Audit Trail
              </CardTitle>
              <CardDescription>
                Track all financial transactions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock audit log entries */}
                <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Commission rate updated</div>
                      <div className="text-sm text-gray-600">
                        Volume Tier 2 rate changed from 26% to 25% for creator
                        Sarah Photography
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">2 hours ago</div>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Payout processed</div>
                      <div className="text-sm text-gray-600">
                        Monthly payout of £18,450 sent to Sarah Photography via
                        Stripe Connect
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">1 day ago</div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        Template revenue recorded
                      </div>
                      <div className="text-sm text-gray-600">
                        £49 sale for "Client Onboarding Email Sequence" -
                        Commission: £12.25, Creator: £36.75
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">3 days ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Exports
              </CardTitle>
              <CardDescription>
                Export raw data for external analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <FileSpreadsheet className="h-6 w-6 mb-2" />
                  Revenue Data (CSV)
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Receipt className="h-6 w-6 mb-2" />
                  Creator Earnings (Excel)
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BarChart className="h-6 w-6 mb-2" />
                  Template Analytics (JSON)
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Calculator className="h-6 w-6 mb-2" />
                  Commission Data (CSV)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
