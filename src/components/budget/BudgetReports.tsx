'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from 'date-fns';
import {
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Clock,
  Settings,
  Mail,
  RefreshCw,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  report_name: string;
  report_type: string;
  filters: any;
  schedule_frequency?: string;
  last_generated_at?: string;
  export_format: string;
}

interface BudgetData {
  categories: any[];
  transactions: any[];
  totals: any;
  analytics: any;
}

export default function BudgetReports() {
  const [reports, setReports] = useState<ReportTemplate[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const [newReport, setNewReport] = useState({
    report_name: '',
    report_type: 'summary',
    filters: {},
    export_format: 'pdf',
    schedule_frequency: null as string | null,
  });

  const reportTypes = [
    {
      value: 'summary',
      label: 'Budget Summary',
      description: 'Overview of all categories and spending',
    },
    {
      value: 'detailed',
      label: 'Detailed Report',
      description: 'Complete transaction history with analysis',
    },
    {
      value: 'category_breakdown',
      label: 'Category Breakdown',
      description: 'Spending analysis by category',
    },
    {
      value: 'vendor_spending',
      label: 'Vendor Analysis',
      description: 'Spending patterns by vendor',
    },
    {
      value: 'monthly_trend',
      label: 'Monthly Trends',
      description: 'Month-over-month spending analysis',
    },
    {
      value: 'payment_schedule',
      label: 'Payment Schedule',
      description: 'Upcoming and past payment milestones',
    },
    {
      value: 'variance_analysis',
      label: 'Variance Analysis',
      description: 'Budget vs actual spending comparison',
    },
  ];

  const exportFormats = [
    { value: 'pdf', label: 'PDF Document', icon: FileText },
    { value: 'csv', label: 'CSV Spreadsheet', icon: BarChart3 },
    { value: 'excel', label: 'Excel Workbook', icon: BarChart3 },
  ];

  const scheduleOptions = [
    { value: null, label: 'One-time' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ];

  const supabase = await createClient();

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch saved reports
      const { data: reportsData } = await supabase
        .from('budget_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('last_generated_at', { ascending: false, nullsFirst: false });

      setReports(reportsData || []);

      // Fetch budget data for reports
      const [categoriesRes, transactionsRes, totalsRes] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),

        supabase
          .from('budget_transactions')
          .select('*, category:budget_categories(name, color)')
          .eq('user_id', user.id)
          .gte('transaction_date', format(dateRange.start, 'yyyy-MM-dd'))
          .lte('transaction_date', format(dateRange.end, 'yyyy-MM-dd'))
          .order('transaction_date', { ascending: false }),

        supabase.rpc('calculate_budget_totals', { p_user_id: user.id }),
      ]);

      setBudgetData({
        categories: categoriesRes.data || [],
        transactions: transactionsRes.data || [],
        totals: totalsRes.data,
        analytics: await generateAnalytics(
          categoriesRes.data || [],
          transactionsRes.data || [],
        ),
      });
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = async (categories: any[], transactions: any[]) => {
    // Calculate spending trends
    const monthlySpending = transactions.reduce((acc, tx) => {
      const month = format(parseISO(tx.transaction_date), 'yyyy-MM');
      acc[month] = (acc[month] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

    // Top spending categories
    const categorySpending = categories
      .map((cat) => ({
        name: cat.name,
        spent: cat.spent_amount,
        allocated: cat.allocated_amount,
        percentage:
          cat.allocated_amount > 0
            ? (cat.spent_amount / cat.allocated_amount) * 100
            : 0,
      }))
      .sort((a, b) => b.spent - a.spent);

    // Vendor analysis
    const vendorSpending = transactions.reduce((acc, tx) => {
      if (tx.vendor_name) {
        acc[tx.vendor_name] = (acc[tx.vendor_name] || 0) + Math.abs(tx.amount);
      }
      return acc;
    }, {});

    const topVendors = Object.entries(vendorSpending)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 10);

    return {
      monthlySpending,
      categorySpending,
      topVendors,
      totalTransactions: transactions.length,
      avgTransactionAmount:
        transactions.length > 0
          ? transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) /
            transactions.length
          : 0,
    };
  };

  const generateReport = async (reportTemplate: ReportTemplate) => {
    if (!budgetData) return;

    setGenerating(reportTemplate.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const reportData = await buildReportData(reportTemplate, budgetData);

      if (reportTemplate.export_format === 'pdf') {
        await generatePDFReport(reportData, reportTemplate);
      } else if (reportTemplate.export_format === 'csv') {
        await generateCSVReport(reportData, reportTemplate);
      } else if (reportTemplate.export_format === 'excel') {
        await generateExcelReport(reportData, reportTemplate);
      }

      // Update last generated timestamp
      await supabase
        .from('budget_reports')
        .update({ last_generated_at: new Date().toISOString() })
        .eq('id', reportTemplate.id);

      fetchData();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const buildReportData = async (
    template: ReportTemplate,
    data: BudgetData,
  ) => {
    const reportData = {
      metadata: {
        title: template.report_name,
        type: template.report_type,
        generated_at: new Date(),
        date_range: dateRange,
        filters: template.filters,
      },
      summary: {
        total_budget: data.totals?.total_budget || 0,
        total_spent: data.totals?.total_spent || 0,
        total_remaining: data.totals?.total_remaining || 0,
        spending_percentage: data.totals?.spending_percentage || 0,
        categories_count: data.categories.length,
        transactions_count: data.transactions.length,
      },
      categories: data.categories.map((cat) => ({
        name: cat.name,
        allocated: cat.allocated_amount,
        spent: cat.spent_amount,
        remaining: cat.remaining_amount,
        percentage:
          cat.allocated_amount > 0
            ? Math.round((cat.spent_amount / cat.allocated_amount) * 100)
            : 0,
        status:
          cat.spent_amount > cat.allocated_amount ? 'over_budget' : 'on_track',
      })),
      transactions: data.transactions.map((tx) => ({
        date: tx.transaction_date,
        description: tx.description,
        category: tx.category?.name || 'Unknown',
        vendor: tx.vendor_name,
        amount: tx.amount,
        type: tx.transaction_type,
        payment_method: tx.payment_method,
      })),
      analytics: data.analytics,
    };

    return reportData;
  };

  const generatePDFReport = async (
    reportData: any,
    template: ReportTemplate,
  ) => {
    // In a real app, you'd use a PDF generation library like jsPDF or Puppeteer
    const content = generateReportHTML(reportData, template);

    // For demo purposes, create a blob and download
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.report_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateCSVReport = async (
    reportData: any,
    template: ReportTemplate,
  ) => {
    let csvContent = '';

    // Add summary
    csvContent += 'Budget Summary\n';
    csvContent += `Total Budget,${reportData.summary.total_budget}\n`;
    csvContent += `Total Spent,${reportData.summary.total_spent}\n`;
    csvContent += `Remaining,${reportData.summary.total_remaining}\n\n`;

    // Add categories
    csvContent += 'Categories\n';
    csvContent += 'Name,Allocated,Spent,Remaining,Percentage Used\n';
    reportData.categories.forEach((cat: any) => {
      csvContent += `${cat.name},${cat.allocated},${cat.spent},${cat.remaining},${cat.percentage}%\n`;
    });

    csvContent += '\nTransactions\n';
    csvContent += 'Date,Description,Category,Vendor,Amount,Type\n';
    reportData.transactions.forEach((tx: any) => {
      csvContent += `${tx.date},${tx.description},${tx.category},${tx.vendor || ''},${tx.amount},${tx.type}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.report_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateExcelReport = async (
    reportData: any,
    template: ReportTemplate,
  ) => {
    // For demo, generate CSV (in real app, use ExcelJS)
    await generateCSVReport(reportData, template);
  };

  const generateReportHTML = (reportData: any, template: ReportTemplate) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${template.report_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .table th { background-color: #f8f9fa; }
          .over-budget { color: #dc3545; font-weight: bold; }
          .on-track { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${template.report_name}</h1>
          <p>Generated on ${format(reportData.metadata.generated_at, 'MMMM dd, yyyy')}</p>
          <p>Period: ${format(reportData.metadata.date_range.start, 'MMM dd')} - ${format(reportData.metadata.date_range.end, 'MMM dd, yyyy')}</p>
        </div>

        <div class="summary">
          <h2>Budget Summary</h2>
          <p><strong>Total Budget:</strong> $${reportData.summary.total_budget.toLocaleString()}</p>
          <p><strong>Total Spent:</strong> $${reportData.summary.total_spent.toLocaleString()} (${reportData.summary.spending_percentage}%)</p>
          <p><strong>Remaining:</strong> $${reportData.summary.total_remaining.toLocaleString()}</p>
        </div>

        <h2>Category Breakdown</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Allocated</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>% Used</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.categories
              .map(
                (cat: any) => `
              <tr>
                <td>${cat.name}</td>
                <td>$${cat.allocated.toLocaleString()}</td>
                <td>$${cat.spent.toLocaleString()}</td>
                <td>$${cat.remaining.toLocaleString()}</td>
                <td>${cat.percentage}%</td>
                <td class="${cat.status === 'over_budget' ? 'over-budget' : 'on-track'}">
                  ${cat.status === 'over_budget' ? 'Over Budget' : 'On Track'}
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        ${
          template.report_type === 'detailed'
            ? `
          <h2>Recent Transactions</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions
                .slice(0, 50)
                .map(
                  (tx: any) => `
                <tr>
                  <td>${format(parseISO(tx.date), 'MMM dd, yyyy')}</td>
                  <td>${tx.description}</td>
                  <td>${tx.category}</td>
                  <td>${tx.vendor || '-'}</td>
                  <td>$${Math.abs(tx.amount).toLocaleString()}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </body>
      </html>
    `;
  };

  const createReport = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('budget_reports').insert([
        {
          user_id: user.id,
          ...newReport,
        },
      ]);

      if (!error) {
        setShowCreateModal(false);
        setNewReport({
          report_name: '',
          report_type: 'summary',
          filters: {},
          export_format: 'pdf',
          schedule_frequency: null,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report template?'))
      return;

    try {
      const { error } = await supabase
        .from('budget_reports')
        .delete()
        .eq('id', reportId);

      if (!error) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Budget Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Generate and export comprehensive budget reports
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Report
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Date Range:
            </span>
          </div>
          <input
            type="date"
            value={format(dateRange.start, 'yyyy-MM-dd')}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                start: new Date(e.target.value),
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={format(dateRange.end, 'yyyy-MM-dd')}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                end: new Date(e.target.value),
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() =>
              setDateRange({
                start: startOfMonth(new Date()),
                end: endOfMonth(new Date()),
              })
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all duration-200"
          >
            This Month
          </button>
          <button
            onClick={() =>
              setDateRange({
                start: startOfYear(new Date()),
                end: new Date(),
              })
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all duration-200"
          >
            This Year
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.slice(0, 4).map((type) => (
          <div
            key={type.value}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{type.label}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{type.description}</p>
            <button
              onClick={() => {
                if (budgetData) {
                  generateReport({
                    id: 'quick-' + type.value,
                    report_name: type.label,
                    report_type: type.value,
                    filters: {},
                    export_format: 'pdf',
                  } as ReportTemplate);
                }
              }}
              disabled={generating === 'quick-' + type.value}
              className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {generating === 'quick-' + type.value ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Generate
            </button>
          </div>
        ))}
      </div>

      {/* Saved Reports */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Saved Report Templates
          </h3>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No saved reports yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => {
              const reportTypeConfig = reportTypes.find(
                (t) => t.value === report.report_type,
              );
              const formatConfig = exportFormats.find(
                (f) => f.value === report.export_format,
              );
              const FormatIcon = formatConfig?.icon || FileText;

              return (
                <div
                  key={report.id}
                  className="p-6 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <FormatIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {report.report_name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {reportTypeConfig?.label || report.report_type} •{' '}
                          {formatConfig?.label}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          {report.schedule_frequency && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {report.schedule_frequency}
                            </div>
                          )}
                          {report.last_generated_at && (
                            <div>
                              Last generated:{' '}
                              {format(
                                parseISO(report.last_generated_at),
                                'MMM dd, yyyy',
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateReport(report)}
                        disabled={generating === report.id}
                        className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                      >
                        {generating === report.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Generate
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-2.5 text-gray-400 hover:text-error-600 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create Report Template
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Name
                  </label>
                  <input
                    type="text"
                    value={newReport.report_name}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        report_name: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="Enter report name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Type
                  </label>
                  <select
                    value={newReport.report_type}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        report_type: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    {reportTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Export Format
                  </label>
                  <select
                    value={newReport.export_format}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        export_format: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    {exportFormats.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (Optional)
                  </label>
                  <select
                    value={newReport.schedule_frequency || ''}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        schedule_frequency: e.target.value || null,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    {scheduleOptions.map((option) => (
                      <option
                        key={option.value || 'null'}
                        value={option.value || ''}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createReport}
                  disabled={!newReport.report_name}
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-all duration-200"
                >
                  Create Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
