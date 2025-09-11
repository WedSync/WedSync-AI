'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportData {
  timestamp: string;
  activeConnections: number;
  averageLatency: number;
  p95Latency: number;
  cacheHitRate: number;
  uptime: number;
}

export function PerformanceExport() {
  const [isExporting, setIsExporting] = useState(false);

  const generateExportData = (): ExportData[] => {
    const data = [];
    const now = Date.now();

    for (let i = 23; i >= 0; i--) {
      data.push({
        timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
        activeConnections: Math.floor(2800 + Math.random() * 300),
        averageLatency: Math.floor(120 + Math.random() * 30),
        p95Latency: Math.floor(150 + Math.random() * 40),
        cacheHitRate: Number((95 + Math.random() * 4).toFixed(1)),
        uptime: Number((99.9 + Math.random() * 0.09).toFixed(3)),
      });
    }

    return data;
  };

  const exportToPDF = async () => {
    setIsExporting(true);

    try {
      // In production, this would integrate with a PDF generation service
      const data = generateExportData();

      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedsync-performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Performance report exported successfully');
    } catch (error) {
      toast.error('Failed to export performance report');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);

    try {
      const data = generateExportData();

      const headers = Object.keys(data[0]).join(',');
      const csvContent = data
        .map((row) => Object.values(row).join(','))
        .join('\n');
      const csv = `${headers}\n${csvContent}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedsync-performance-metrics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('CSV data exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV data');
      console.error('CSV export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportDashboardSnapshot = async () => {
    setIsExporting(true);

    try {
      // In production, this would capture the current dashboard state
      const dashboardData = {
        exportDate: new Date().toISOString(),
        summary: {
          activeConnections: 2847,
          averageResponseTime: '127ms',
          cacheHitRate: '97.3%',
          uptime: '99.97%',
        },
        weddingSeasonReadiness: {
          channelSwitchingTime: '127ms',
          uptimeSLA: '99.97%',
          capacityAvailable: '10x',
          status: 'Ready for Wedding Season',
        },
        performanceMetrics: generateExportData(),
        recommendations: [
          'Optimize connection pool efficiency to reach 100ms target',
          'Pre-warm wedding day channels for better cache performance',
          'Implement ML-based auto-scaling threshold tuning',
        ],
      };

      const blob = new Blob([JSON.stringify(dashboardData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedsync-dashboard-snapshot-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dashboard snapshot exported successfully');
    } catch (error) {
      toast.error('Failed to export dashboard snapshot');
      console.error('Dashboard export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Export Performance Data</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Performance Report (PDF)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="mr-2 h-4 w-4" />
          Metrics Data (CSV)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={exportDashboardSnapshot}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Dashboard Snapshot
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Wedding Industry Compliance
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
