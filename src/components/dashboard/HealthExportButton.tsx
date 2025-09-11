'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Dropdown } from '@/components/ui/dropdown';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Share2,
  Calendar,
  Mail,
} from 'lucide-react';
import type {
  SupplierHealthMetrics,
  HealthDashboardFilters,
  DashboardSummary,
  HealthExportData,
} from '@/types/supplier-health';

interface HealthExportButtonProps {
  suppliers: SupplierHealthMetrics[];
  filters: HealthDashboardFilters;
  summary: DashboardSummary;
  disabled?: boolean;
  className?: string;
}

export function HealthExportButton({
  suppliers,
  filters,
  summary,
  disabled = false,
  className = '',
}: HealthExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generateExportData = (
    reportType: 'csv' | 'pdf' | 'xlsx',
  ): HealthExportData => ({
    suppliers,
    generatedAt: new Date(),
    filters,
    summary,
    reportType,
  });

  const exportToCSV = async () => {
    setIsExporting(true);

    try {
      const exportData = generateExportData('csv');

      // Create CSV headers
      const headers = [
        'Supplier Name',
        'Business Name',
        'Category',
        'Health Score',
        'Risk Level',
        'Active Clients',
        'Revenue',
        'Client Satisfaction',
        'Avg Response Time (hrs)',
        'Last Activity',
        'Critical Interventions',
        'Total Interventions',
      ];

      // Create CSV rows
      const rows = exportData.suppliers.map((supplier) => [
        supplier.supplier_name,
        supplier.supplier_business_name || '',
        supplier.supplier_category,
        supplier.health_score.toString(),
        supplier.risk_level,
        supplier.active_clients.toString(),
        supplier.revenue.toString(),
        supplier.client_satisfaction.toString(),
        supplier.avg_response_time.toString(),
        new Date(supplier.last_activity).toLocaleDateString(),
        supplier.interventionsNeeded
          .filter((i) => i.priority === 'critical')
          .length.toString(),
        supplier.interventionsNeeded.length.toString(),
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `supplier-health-report-${new Date().toISOString().split('T')[0]}.csv`,
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);

    try {
      const exportData = generateExportData('pdf');

      // Send to API for PDF generation
      const response = await fetch('/api/admin/reports/supplier-health/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `supplier-health-report-${new Date().toISOString().split('T')[0]}.pdf`,
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);

    try {
      const exportData = generateExportData('xlsx');

      // Send to API for Excel generation
      const response = await fetch('/api/admin/reports/supplier-health/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Excel generation failed');
      }

      // Download the Excel file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `supplier-health-report-${new Date().toISOString().split('T')[0]}.xlsx`,
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const scheduleReport = async () => {
    setIsExporting(true);

    try {
      const exportData = generateExportData('pdf');

      // Send to API for scheduling
      const response = await fetch(
        '/api/admin/reports/supplier-health/schedule',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...exportData,
            frequency: 'weekly', // Could be configurable
            recipients: [], // Could be configurable
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Report scheduling failed');
      }

      // Show success notification (would integrate with notification system)
      console.log('Report scheduled successfully');
    } catch (error) {
      console.error('Schedule report failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const printReport = () => {
    // Generate a print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supplier Health Dashboard Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              margin: 20px; 
              color: #333;
              line-height: 1.6;
            }
            .header { 
              border-bottom: 2px solid #e5e7eb; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
              text-align: center;
            }
            .header h1 { 
              color: #1f2937; 
              font-size: 28px; 
              margin-bottom: 10px; 
            }
            .header p { 
              color: #6b7280; 
              font-size: 14px;
            }
            .summary { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 20px; 
              margin-bottom: 30px; 
            }
            .metric { 
              padding: 15px; 
              border: 1px solid #e5e7eb; 
              border-radius: 8px;
              text-align: center;
            }
            .metric-label { 
              font-size: 14px; 
              color: #6b7280; 
              margin-bottom: 5px;
            }
            .metric-value { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1f2937; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 12px;
            }
            th, td { 
              padding: 8px; 
              text-align: left; 
              border-bottom: 1px solid #e5e7eb; 
            }
            th { 
              background-color: #f9fafb; 
              font-weight: bold; 
              color: #374151;
            }
            .risk-green { color: #059669; font-weight: bold; }
            .risk-yellow { color: #d97706; font-weight: bold; }
            .risk-red { color: #dc2626; font-weight: bold; }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px;
            }
            @media print {
              body { margin: 0; font-size: 11px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Supplier Health Dashboard Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Total Suppliers: ${summary.totalSuppliers}</p>
          </div>
          
          <div class="summary">
            <div class="metric">
              <div class="metric-label">Average Health Score</div>
              <div class="metric-value">${summary.avgHealthScore.toFixed(1)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Revenue</div>
              <div class="metric-value">${formatCurrency(summary.totalRevenue)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Active Clients</div>
              <div class="metric-value">${summary.totalActiveClients}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Critical Interventions</div>
              <div class="metric-value">${summary.criticalInterventions}</div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3>Risk Distribution</h3>
            <div style="display: flex; gap: 20px; margin-top: 10px;">
              <span class="risk-green">● Healthy: ${summary.riskDistribution.green}</span>
              <span class="risk-yellow">● At Risk: ${summary.riskDistribution.yellow}</span>
              <span class="risk-red">● Critical: ${summary.riskDistribution.red}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Category</th>
                <th>Health Score</th>
                <th>Risk Level</th>
                <th>Active Clients</th>
                <th>Revenue</th>
                <th>Satisfaction</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              ${suppliers
                .map(
                  (supplier) => `
                <tr>
                  <td>${supplier.supplier_name}</td>
                  <td style="text-transform: capitalize;">${supplier.supplier_category}</td>
                  <td>${supplier.health_score}</td>
                  <td class="risk-${supplier.risk_level}" style="text-transform: uppercase;">
                    ${supplier.risk_level}
                  </td>
                  <td>${supplier.active_clients}</td>
                  <td>${formatCurrency(supplier.revenue)}</td>
                  <td>${supplier.client_satisfaction.toFixed(1)}/5</td>
                  <td>${new Date(supplier.last_activity).toLocaleDateString()}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This report was generated automatically by the WedSync Customer Success Dashboard</p>
            <p>For questions about this report, please contact your Customer Success team</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const shareReport = async () => {
    // Simple share functionality - could be enhanced with more options
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Supplier Health Dashboard Report',
          text: `Health report for ${suppliers.length} suppliers - ${summary.criticalInterventions} critical actions needed`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        console.log('Report URL copied to clipboard');
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
      }
    }
  };

  const exportOptions = [
    {
      label: 'Export as CSV',
      icon: FileSpreadsheet,
      action: exportToCSV,
      description: 'Spreadsheet format for analysis',
    },
    {
      label: 'Export as PDF',
      icon: FileText,
      action: exportToPDF,
      description: 'Professional formatted report',
    },
    {
      label: 'Export as Excel',
      icon: FileSpreadsheet,
      action: exportToExcel,
      description: 'Excel workbook with charts',
    },
    {
      label: 'Print Report',
      icon: Printer,
      action: printReport,
      description: 'Print-optimized version',
    },
    {
      label: 'Schedule Report',
      icon: Calendar,
      action: scheduleReport,
      description: 'Set up recurring reports',
    },
    {
      label: 'Share Report',
      icon: Share2,
      action: shareReport,
      description: 'Share with team members',
    },
  ];

  return (
    <Dropdown
      trigger={
        <Button
          variant="secondary"
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </>
          )}
        </Button>
      }
      align="end"
    >
      <div className="w-64">
        <div className="p-2 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
          <p className="text-xs text-gray-500 mt-1">
            {suppliers.length} suppliers • Generated{' '}
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="py-2">
          {exportOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                onClick={option.action}
                disabled={isExporting}
                className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon className="h-4 w-4 mt-0.5 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Dropdown>
  );
}

export default HealthExportButton;
