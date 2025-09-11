'use client';

import React, { useState } from 'react';
import { Card } from '@/components/untitled-ui/card';
import { Button } from '@/components/untitled-ui/button';
import { Select } from '@/components/untitled-ui/select';
import { Badge } from '@/components/untitled-ui/badge';
import { createClient } from '@/lib/supabase/client';
import {
  Download,
  FileText,
  Image,
  BarChart3,
  Users,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ExportOptions {
  reportType: string;
  format: 'pdf' | 'csv' | 'excel' | 'json';
  dateRange: string;
  includeCharts: boolean;
  filters: Record<string, any>;
}

const REPORT_TYPES = [
  {
    value: 'response_rate',
    label: 'Response Rate Analysis',
    description: 'Form submission rates and trends',
    icon: BarChart3,
    dataTypes: ['metrics', 'time_series', 'form_breakdown'],
  },
  {
    value: 'guest_demographics',
    label: 'Guest Demographics',
    description: 'Age, location, dietary preferences',
    icon: Users,
    dataTypes: ['age_groups', 'locations', 'dietary_prefs', 'rsvp_status'],
  },
  {
    value: 'vendor_tracking',
    label: 'Vendor Completion',
    description: 'Form completion status by vendor',
    icon: Building2,
    dataTypes: ['completion_rates', 'overdue_items', 'vendor_details'],
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive Report',
    description: 'All analytics data combined',
    icon: FileText,
    dataTypes: ['all'],
  },
];

const EXPORT_FORMATS = [
  {
    value: 'pdf',
    label: 'PDF Report',
    icon: FileText,
    description: 'Formatted report with charts',
  },
  {
    value: 'csv',
    label: 'CSV Data',
    icon: FileText,
    description: 'Raw data for spreadsheets',
  },
  {
    value: 'excel',
    label: 'Excel Workbook',
    icon: FileText,
    description: 'Multi-sheet workbook',
  },
  {
    value: 'json',
    label: 'JSON Data',
    icon: FileText,
    description: 'Structured data for APIs',
  },
];

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
];

export function ExportReports() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    reportType: '',
    format: 'pdf',
    dateRange: '30',
    includeCharts: true,
    filters: {},
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const supabase = await createClient();

  const handleExport = async () => {
    if (!exportOptions.reportType) {
      alert('Please select a report type');
      return;
    }

    setIsExporting(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orgId = user?.user_metadata.organization_id;

      // Generate export based on type
      let exportData: any = {};
      const reportType = REPORT_TYPES.find(
        (t) => t.value === exportOptions.reportType,
      );

      if (
        exportOptions.reportType === 'response_rate' ||
        exportOptions.reportType === 'comprehensive'
      ) {
        // Fetch response rate data
        const { data: responseData } = await supabase.rpc(
          'calculate_response_rate',
          {
            p_organization_id: orgId,
            p_start_date: getStartDate(),
            p_end_date: new Date().toISOString().split('T')[0],
          },
        );

        const { data: timeSeriesData } = await supabase
          .from('analytics.response_rate_metrics')
          .select('*')
          .eq('organization_id', orgId)
          .gte('metric_date', getStartDate())
          .order('metric_date', { ascending: true });

        exportData.responseRates = responseData;
        exportData.timeSeries = timeSeriesData;
      }

      if (
        exportOptions.reportType === 'guest_demographics' ||
        exportOptions.reportType === 'comprehensive'
      ) {
        // Fetch demographic data
        const { data: demographicData } = await supabase.rpc(
          'aggregate_guest_demographics',
          {
            p_organization_id: orgId,
          },
        );

        const { data: guestData } = await supabase
          .from('analytics.guest_demographics')
          .select('*')
          .eq('organization_id', orgId);

        exportData.demographics = demographicData;
        exportData.guests = guestData;
      }

      if (
        exportOptions.reportType === 'vendor_tracking' ||
        exportOptions.reportType === 'comprehensive'
      ) {
        // Fetch vendor data
        const { data: vendorData } = await supabase.rpc(
          'vendor_completion_status',
          {
            p_organization_id: orgId,
          },
        );

        const { data: vendorDetails } = await supabase
          .from('analytics.vendor_completion')
          .select('*')
          .eq('organization_id', orgId);

        exportData.vendors = vendorData;
        exportData.vendorDetails = vendorDetails;
      }

      // Process export based on format
      let blob: Blob;
      let filename: string;

      switch (exportOptions.format) {
        case 'csv':
          const csvData = convertToCSV(exportData);
          blob = new Blob([csvData], { type: 'text/csv' });
          filename = `${exportOptions.reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'json':
          const jsonData = JSON.stringify(exportData, null, 2);
          blob = new Blob([jsonData], { type: 'application/json' });
          filename = `${exportOptions.reportType}_report_${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'excel':
          // For Excel, we'll generate CSV for now (would need a library like xlsx for proper Excel)
          const excelData = convertToCSV(exportData);
          blob = new Blob([excelData], { type: 'text/csv' });
          filename = `${exportOptions.reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'pdf':
        default:
          // For PDF, we'll generate HTML content that can be printed to PDF
          const htmlContent = generateHTMLReport(exportData, reportType);
          blob = new Blob([htmlContent], { type: 'text/html' });
          filename = `${exportOptions.reportType}_report_${new Date().toISOString().split('T')[0]}.html`;
          break;
      }

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Log export to history
      await logExport(filename, exportOptions.format, exportData);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStartDate = () => {
    if (exportOptions.dateRange === 'all') {
      return '2020-01-01';
    }
    const date = new Date();
    date.setDate(date.getDate() - parseInt(exportOptions.dateRange));
    return date.toISOString().split('T')[0];
  };

  const convertToCSV = (data: any): string => {
    const csvRows: string[] = [];

    // Add headers and data based on export type
    if (data.responseRates) {
      csvRows.push('Form Type,Total Sent,Total Completed,Response Rate');
      data.responseRates.forEach((item: any) => {
        csvRows.push(
          `${item.form_type},${item.total_sent},${item.total_completed},${item.response_rate}%`,
        );
      });
    }

    if (data.demographics) {
      csvRows.push(''); // Empty line
      csvRows.push('Age Group,Count,Avg Travel Distance,Accommodation %');
      data.demographics.forEach((item: any) => {
        csvRows.push(
          `${item.age_group},${item.count},${item.avg_travel_distance},${item.accommodation_percentage}%`,
        );
      });
    }

    if (data.vendors) {
      csvRows.push(''); // Empty line
      csvRows.push(
        'Vendor Name,Total Forms,Completed Forms,In Progress,Overdue,Avg Completion %',
      );
      data.vendors.forEach((item: any) => {
        csvRows.push(
          `${item.vendor_name},${item.total_forms},${item.completed_forms},${item.in_progress_forms},${item.overdue_forms},${item.avg_completion_percentage}%`,
        );
      });
    }

    return csvRows.join('\n');
  };

  const generateHTMLReport = (data: any, reportType: any): string => {
    const currentDate = new Date().toLocaleDateString();

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType?.label} - Analytics Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #111827; }
          .header { border-bottom: 2px solid #7F56D9; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #7F56D9; margin: 0; }
          .header p { color: #6B7280; margin: 5px 0 0 0; }
          .section { margin-bottom: 40px; }
          .section h2 { color: #374151; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
          .metric-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; background: #F9FAFB; }
          .metric-value { font-size: 2em; font-weight: bold; color: #111827; }
          .metric-label { color: #6B7280; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; }
          th { background: #F3F4F6; font-weight: 600; }
          .status-completed { color: #059669; font-weight: 600; }
          .status-overdue { color: #DC2626; font-weight: 600; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportType?.label}</h1>
          <p>Generated on ${currentDate} • WedSync Analytics</p>
        </div>
    `;

    // Add Response Rate section
    if (data.responseRates && data.responseRates.length > 0) {
      const totalSent = data.responseRates.reduce(
        (sum: number, r: any) => sum + r.total_sent,
        0,
      );
      const totalCompleted = data.responseRates.reduce(
        (sum: number, r: any) => sum + r.total_completed,
        0,
      );
      const overallRate =
        totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;

      htmlContent += `
        <div class="section">
          <h2>Response Rate Summary</h2>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${overallRate}%</div>
              <div class="metric-label">Overall Response Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${totalSent}</div>
              <div class="metric-label">Total Forms Sent</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${totalCompleted}</div>
              <div class="metric-label">Forms Completed</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Form Type</th><th>Total Sent</th><th>Completed</th><th>Response Rate</th></tr>
            </thead>
            <tbody>
              ${data.responseRates
                .map(
                  (r: any) => `
                <tr>
                  <td>${r.form_type}</td>
                  <td>${r.total_sent}</td>
                  <td>${r.total_completed}</td>
                  <td>${r.response_rate}%</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Add Demographics section
    if (data.demographics && data.demographics.length > 0) {
      const totalGuests = data.demographics.reduce(
        (sum: number, d: any) => sum + d.count,
        0,
      );

      htmlContent += `
        <div class="section">
          <h2>Guest Demographics</h2>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${totalGuests}</div>
              <div class="metric-label">Total Guests</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Age Group</th><th>Count</th><th>Avg Travel Distance</th><th>Accommodation Needed</th></tr>
            </thead>
            <tbody>
              ${data.demographics
                .map(
                  (d: any) => `
                <tr>
                  <td>${d.age_group}</td>
                  <td>${d.count}</td>
                  <td>${d.avg_travel_distance}km</td>
                  <td>${d.accommodation_percentage}%</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Add Vendor section
    if (data.vendors && data.vendors.length > 0) {
      const totalVendors = data.vendors.length;
      const completedVendors = data.vendors.filter(
        (v: any) => v.avg_completion_percentage === 100,
      ).length;

      htmlContent += `
        <div class="section">
          <h2>Vendor Completion Status</h2>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${totalVendors}</div>
              <div class="metric-label">Total Vendors</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${completedVendors}</div>
              <div class="metric-label">Fully Completed</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Vendor</th><th>Total Forms</th><th>Completed</th><th>In Progress</th><th>Overdue</th><th>Completion %</th></tr>
            </thead>
            <tbody>
              ${data.vendors
                .map(
                  (v: any) => `
                <tr>
                  <td>${v.vendor_name}</td>
                  <td>${v.total_forms}</td>
                  <td class="status-completed">${v.completed_forms}</td>
                  <td>${v.in_progress_forms}</td>
                  <td class="status-overdue">${v.overdue_forms}</td>
                  <td>${v.avg_completion_percentage}%</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    htmlContent += `
        <div class="footer">
          <p>This report was generated automatically by WedSync Analytics. For questions or support, contact your wedding planning team.</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const logExport = async (filename: string, format: string, data: any) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      await supabase.from('export_logs').insert({
        user_id: user?.id,
        organization_id: user?.user_metadata.organization_id,
        filename,
        format,
        report_type: exportOptions.reportType,
        date_range: exportOptions.dateRange,
        record_count: Object.keys(data).length,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log export:', error);
    }
  };

  const selectedReportType = REPORT_TYPES.find(
    (t) => t.value === exportOptions.reportType,
  );
  const selectedFormat = EXPORT_FORMATS.find(
    (f) => f.value === exportOptions.format,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Export Analytics Reports
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Generate and download comprehensive analytics reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Report Configuration
          </h3>

          <div className="space-y-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="space-y-2">
                {REPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        exportOptions.reportType === type.value
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() =>
                        setExportOptions({
                          ...exportOptions,
                          reportType: type.value,
                        })
                      }
                    >
                      <div className="flex items-center">
                        <Icon
                          className={`w-5 h-5 mr-3 ${
                            exportOptions.reportType === type.value
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {type.label}
                          </p>
                          <p className="text-sm text-gray-500">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: 'pdf' | 'csv' | 'excel' | 'json') =>
                  setExportOptions({ ...exportOptions, format: value })
                }
              >
                {EXPORT_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </Select>
              {selectedFormat && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedFormat.description}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <Select
                value={exportOptions.dateRange}
                onValueChange={(value) =>
                  setExportOptions({ ...exportOptions, dateRange: value })
                }
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Additional Options */}
            {(exportOptions.format === 'pdf' ||
              exportOptions.format === 'excel') && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        includeCharts: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Include charts and visualizations
                </label>
              </div>
            )}
          </div>

          <Button
            onClick={handleExport}
            disabled={!exportOptions.reportType || isExporting}
            className="w-full mt-6"
          >
            {isExporting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </Card>

        {/* Preview & Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Export Preview
          </h3>

          {selectedReportType ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <selectedReportType.icon className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedReportType.label}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedReportType.description}
                  </p>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">
                  Data Included:
                </h5>
                <div className="space-y-1">
                  {selectedReportType.dataTypes.includes('metrics') ||
                  selectedReportType.dataTypes.includes('all') ? (
                    <Badge variant="primary">Response Metrics</Badge>
                  ) : null}
                  {selectedReportType.dataTypes.includes('time_series') ||
                  selectedReportType.dataTypes.includes('all') ? (
                    <Badge variant="blue">Time Series Data</Badge>
                  ) : null}
                  {selectedReportType.dataTypes.includes('age_groups') ||
                  selectedReportType.dataTypes.includes('all') ? (
                    <Badge variant="success">Age Groups</Badge>
                  ) : null}
                  {selectedReportType.dataTypes.includes('locations') ||
                  selectedReportType.dataTypes.includes('all') ? (
                    <Badge variant="warning">Location Data</Badge>
                  ) : null}
                  {selectedReportType.dataTypes.includes('completion_rates') ||
                  selectedReportType.dataTypes.includes('all') ? (
                    <Badge variant="purple">Completion Rates</Badge>
                  ) : null}
                </div>
              </div>

              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  Export Details:
                </h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Format:{' '}
                    <span className="font-medium">{selectedFormat?.label}</span>
                  </div>
                  <div>
                    Date Range:{' '}
                    <span className="font-medium">
                      {
                        DATE_RANGES.find(
                          (r) => r.value === exportOptions.dateRange,
                        )?.label
                      }
                    </span>
                  </div>
                  {exportOptions.includeCharts && (
                    <div className="flex items-center">
                      <Image className="w-4 h-4 mr-1" />
                      Charts included
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-800 font-medium">Export Tips:</p>
                    <ul className="text-blue-700 mt-1 space-y-1">
                      <li>• PDF reports are ideal for presentations</li>
                      <li>• CSV files work well with spreadsheet software</li>
                      <li>• JSON format is perfect for API integrations</li>
                      <li>• Large date ranges may take longer to export</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Select a report type to see preview details
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
