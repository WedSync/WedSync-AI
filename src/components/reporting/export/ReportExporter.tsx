'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image,
  Mail,
  Settings,
  Check,
  X,
  Clock,
  AlertCircle,
  RefreshCw,
  Share2,
  Cloud,
  Printer,
  Palette,
  Layout,
  Filter,
  Calendar,
  Users,
  BarChart3,
  Eye,
  Zap,
} from 'lucide-react';

import {
  ReportTemplate,
  ExportFormat,
  ExportOptions,
  ExportJob,
  ExportStatus,
  WEDDING_COLORS,
  formatDate,
  formatFileSize,
} from '../types';

interface ReportExporterProps {
  reportData: any;
  template: ReportTemplate;
  onExport: (
    format: ExportFormat,
    options: ExportOptions,
  ) => Promise<ExportJob>;
  onCancel: () => void;
  availableFormats?: ExportFormat[];
  className?: string;
}

const EXPORT_FORMATS: Array<{
  format: ExportFormat;
  name: string;
  description: string;
  icon: any;
  color: string;
  fileExtension: string;
  maxSize?: string;
  features: string[];
}> = [
  {
    format: 'pdf',
    name: 'PDF Document',
    description: 'High-quality printable report',
    icon: FileText,
    color: '#ef4444',
    fileExtension: 'pdf',
    maxSize: '50MB',
    features: ['Print-ready', 'Vector graphics', 'Bookmarks', 'Watermarks'],
  },
  {
    format: 'excel',
    name: 'Excel Spreadsheet',
    description: 'Data analysis and manipulation',
    icon: FileSpreadsheet,
    color: '#10b981',
    fileExtension: 'xlsx',
    maxSize: '25MB',
    features: ['Multiple sheets', 'Formulas', 'Charts', 'Pivot tables'],
  },
  {
    format: 'csv',
    name: 'CSV Data',
    description: 'Raw data for analysis',
    icon: FileSpreadsheet,
    color: '#3b82f6',
    fileExtension: 'csv',
    maxSize: '10MB',
    features: [
      'Raw data',
      'Universal format',
      'Lightweight',
      'Database import',
    ],
  },
  {
    format: 'png',
    name: 'PNG Image',
    description: 'High-resolution screenshot',
    icon: Image,
    color: '#8b5cf6',
    fileExtension: 'png',
    maxSize: '20MB',
    features: [
      'High DPI',
      'Transparent background',
      'Social sharing',
      'Web ready',
    ],
  },
  {
    format: 'jpeg',
    name: 'JPEG Image',
    description: 'Compressed image format',
    icon: Image,
    color: '#f59e0b',
    fileExtension: 'jpg',
    maxSize: '15MB',
    features: [
      'Small file size',
      'Email friendly',
      'Universal support',
      'Photo quality',
    ],
  },
];

const DEFAULT_EXPORT_OPTIONS: Record<ExportFormat, Partial<ExportOptions>> = {
  pdf: {
    pageSize: 'A4',
    orientation: 'portrait',
    includeCharts: true,
    includeData: true,
    watermark: false,
    compression: 'medium',
  },
  excel: {
    includeCharts: true,
    includeData: true,
    separateSheets: true,
    includeFormulas: false,
  },
  csv: {
    includeHeaders: true,
    delimiter: ',',
    encoding: 'utf-8',
  },
  png: {
    width: 1920,
    height: 1080,
    dpi: 300,
    background: 'white',
    transparent: false,
  },
  jpeg: {
    width: 1920,
    height: 1080,
    quality: 90,
    background: 'white',
  },
};

const FormatCard = ({
  format,
  isSelected,
  onSelect,
  isAvailable = true,
}: {
  format: (typeof EXPORT_FORMATS)[0];
  isSelected: boolean;
  onSelect: () => void;
  isAvailable?: boolean;
}) => {
  const IconComponent = format.icon;

  return (
    <motion.button
      onClick={onSelect}
      disabled={!isAvailable}
      whileHover={{ scale: isAvailable ? 1.02 : 1 }}
      whileTap={{ scale: isAvailable ? 0.98 : 1 }}
      className={`p-4 border rounded-lg text-left transition-all relative overflow-hidden ${
        isSelected && isAvailable
          ? 'border-wedding-primary bg-wedding-primary/5 shadow-md'
          : isAvailable
            ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg text-white"
            style={{ backgroundColor: isAvailable ? format.color : '#9ca3af' }}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{format.name}</h4>
            <p className="text-sm text-gray-600">{format.description}</p>
          </div>
        </div>

        {isSelected && isAvailable && (
          <div className="p-1 bg-wedding-primary text-white rounded-full">
            <Check className="h-3 w-3" />
          </div>
        )}

        {!isAvailable && (
          <div className="p-1 bg-gray-400 text-white rounded-full">
            <X className="h-3 w-3" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>File type: .{format.fileExtension}</span>
          {format.maxSize && <span>Max: {format.maxSize}</span>}
        </div>

        <div className="flex flex-wrap gap-1">
          {format.features.slice(0, 2).map((feature, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
            >
              {feature}
            </span>
          ))}
          {format.features.length > 2 && (
            <span className="text-xs text-gray-500">
              +{format.features.length - 2} more
            </span>
          )}
        </div>
      </div>

      {!isAvailable && (
        <div className="absolute inset-0 bg-gray-500/10 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
            Not Available
          </span>
        </div>
      )}
    </motion.button>
  );
};

const ExportOptions = ({
  format,
  options,
  onUpdate,
}: {
  format: ExportFormat;
  options: ExportOptions;
  onUpdate: (updates: Partial<ExportOptions>) => void;
}) => {
  const renderPDFOptions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Size
          </label>
          <select
            value={options.pageSize || 'A4'}
            onChange={(e) => onUpdate({ pageSize: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="A4">A4 (8.27 × 11.69 in)</option>
            <option value="A3">A3 (11.69 × 16.53 in)</option>
            <option value="Letter">Letter (8.5 × 11 in)</option>
            <option value="Legal">Legal (8.5 × 14 in)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Orientation
          </label>
          <select
            value={options.orientation || 'portrait'}
            onChange={(e) => onUpdate({ orientation: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compression
          </label>
          <select
            value={options.compression || 'medium'}
            onChange={(e) => onUpdate({ compression: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="none">None (Largest file)</option>
            <option value="low">Low compression</option>
            <option value="medium">Medium compression</option>
            <option value="high">High compression</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quality
          </label>
          <select
            value={options.quality || 90}
            onChange={(e) => onUpdate({ quality: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value={100}>Maximum (100%)</option>
            <option value={90}>High (90%)</option>
            <option value={75}>Medium (75%)</option>
            <option value={60}>Low (60%)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.includeCharts !== false}
            onChange={(e) => onUpdate({ includeCharts: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Include charts and visualizations
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.includeData !== false}
            onChange={(e) => onUpdate({ includeData: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Include raw data tables</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.watermark === true}
            onChange={(e) => onUpdate({ watermark: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Add WedSync watermark</span>
        </label>
      </div>
    </div>
  );

  const renderExcelOptions = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.includeCharts !== false}
            onChange={(e) => onUpdate({ includeCharts: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Include charts in Excel</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.separateSheets !== false}
            onChange={(e) => onUpdate({ separateSheets: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Use separate sheets for each section
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.includeFormulas === true}
            onChange={(e) => onUpdate({ includeFormulas: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Include Excel formulas (advanced)
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date Format
        </label>
        <select
          value={options.dateFormat || 'MM/dd/yyyy'}
          onChange={(e) => onUpdate({ dateFormat: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
        >
          <option value="MM/dd/yyyy">MM/dd/yyyy</option>
          <option value="dd/MM/yyyy">dd/MM/yyyy</option>
          <option value="yyyy-MM-dd">yyyy-MM-dd (ISO)</option>
          <option value="MMM dd, yyyy">MMM dd, yyyy</option>
        </select>
      </div>
    </div>
  );

  const renderCSVOptions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Delimiter
          </label>
          <select
            value={options.delimiter || ','}
            onChange={(e) => onUpdate({ delimiter: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Encoding
          </label>
          <select
            value={options.encoding || 'utf-8'}
            onChange={(e) => onUpdate({ encoding: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="utf-8">UTF-8 (Recommended)</option>
            <option value="utf-16">UTF-16</option>
            <option value="iso-8859-1">ISO-8859-1</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.includeHeaders !== false}
            onChange={(e) => onUpdate({ includeHeaders: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Include column headers</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.quoteAll === true}
            onChange={(e) => onUpdate({ quoteAll: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Quote all fields (safer for special characters)
          </span>
        </label>
      </div>
    </div>
  );

  const renderImageOptions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width (pixels)
          </label>
          <input
            type="number"
            value={options.width || 1920}
            onChange={(e) =>
              onUpdate({ width: parseInt(e.target.value) || 1920 })
            }
            min={800}
            max={4000}
            step={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height (pixels)
          </label>
          <input
            type="number"
            value={options.height || 1080}
            onChange={(e) =>
              onUpdate({ height: parseInt(e.target.value) || 1080 })
            }
            min={600}
            max={4000}
            step={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DPI (Resolution)
          </label>
          <select
            value={options.dpi || 300}
            onChange={(e) => onUpdate({ dpi: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value={72}>72 DPI (Web)</option>
            <option value={150}>150 DPI (Medium)</option>
            <option value={300}>300 DPI (Print Quality)</option>
            <option value={600}>600 DPI (High Quality)</option>
          </select>
        </div>

        {format === 'jpeg' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JPEG Quality
            </label>
            <input
              type="range"
              value={options.quality || 90}
              onChange={(e) => onUpdate({ quality: parseInt(e.target.value) })}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low (10%)</span>
              <span className="font-medium">{options.quality || 90}%</span>
              <span>High (100%)</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Color
        </label>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onUpdate({ background: 'white', transparent: false })
            }
            className={`px-3 py-2 border rounded text-sm ${
              options.background === 'white'
                ? 'border-wedding-primary bg-wedding-primary/5'
                : 'border-gray-300'
            }`}
          >
            White
          </button>
          <button
            onClick={() =>
              onUpdate({ background: 'transparent', transparent: true })
            }
            className={`px-3 py-2 border rounded text-sm ${
              options.background === 'transparent'
                ? 'border-wedding-primary bg-wedding-primary/5'
                : 'border-gray-300'
            }`}
            disabled={format === 'jpeg'}
          >
            Transparent {format === 'jpeg' && '(PNG only)'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-gray-600" />
        <h4 className="font-medium text-gray-900">Export Options</h4>
      </div>

      {format === 'pdf' && renderPDFOptions()}
      {format === 'excel' && renderExcelOptions()}
      {format === 'csv' && renderCSVOptions()}
      {(format === 'png' || format === 'jpeg') && renderImageOptions()}
    </div>
  );
};

const ExportProgress = ({ job }: { job: ExportJob | null }) => {
  if (!job) return null;

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'text-gray-500';
      case 'processing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return Clock;
      case 'processing':
        return RefreshCw;
      case 'completed':
        return Check;
      case 'failed':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 border border-gray-200 rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`h-5 w-5 ${getStatusColor()} ${
              job.status === 'processing' ? 'animate-spin' : ''
            }`}
          />
          <span className="font-medium text-gray-900">Export {job.status}</span>
        </div>

        {job.status === 'completed' && job.fileSize && (
          <span className="text-sm text-gray-600">
            {formatFileSize(job.fileSize)}
          </span>
        )}
      </div>

      {job.status === 'processing' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>{job.currentStep || 'Processing...'}</span>
            <span>{job.progress?.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {job.error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {job.error}
        </div>
      )}

      {job.status === 'completed' && job.downloadUrl && (
        <div className="flex gap-2 pt-2">
          <a
            href={job.downloadUrl}
            download={job.fileName}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </a>

          <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      )}
    </motion.div>
  );
};

export const ReportExporter: React.FC<ReportExporterProps> = ({
  reportData,
  template,
  onExport,
  onCancel,
  availableFormats = ['pdf', 'excel', 'csv', 'png', 'jpeg'],
  className = '',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    () => DEFAULT_EXPORT_OPTIONS[selectedFormat] || {},
  );
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredFormats = useMemo(
    () =>
      EXPORT_FORMATS.filter((format) =>
        availableFormats.includes(format.format),
      ),
    [availableFormats],
  );

  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    setExportOptions(DEFAULT_EXPORT_OPTIONS[format] || {});
    setExportJob(null);
  }, []);

  const handleOptionsUpdate = useCallback((updates: Partial<ExportOptions>) => {
    setExportOptions((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const job = await onExport(selectedFormat, {
        ...exportOptions,
        reportId: reportData.id,
        templateId: template.id,
        timestamp: new Date().toISOString(),
      });
      setExportJob(job);
    } catch (error) {
      console.error('Export failed:', error);
      setExportJob({
        id: `export_${Date.now()}`,
        format: selectedFormat,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Export failed',
        createdAt: new Date(),
        progress: 0,
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, exportOptions, reportData, template, onExport]);

  const selectedFormatConfig = filteredFormats.find(
    (f) => f.format === selectedFormat,
  );

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
          <p className="text-sm text-gray-600">
            Choose format and customize export options
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Select Export Format
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFormats.map((format) => (
              <FormatCard
                key={format.format}
                format={format}
                isSelected={selectedFormat === format.format}
                onSelect={() => handleFormatSelect(format.format)}
                isAvailable={true}
              />
            ))}
          </div>
        </div>

        {/* Export Options */}
        {selectedFormatConfig && (
          <ExportOptions
            format={selectedFormat}
            options={exportOptions}
            onUpdate={handleOptionsUpdate}
          />
        )}

        {/* Export Progress */}
        <ExportProgress job={exportJob} />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Exporting: <strong>{template.name}</strong> as{' '}
            {selectedFormatConfig?.name}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting || exportJob?.status === 'processing'}
              className="flex items-center gap-2 bg-wedding-primary text-white px-6 py-2 rounded-md hover:bg-wedding-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isExporting || exportJob?.status === 'processing' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export {selectedFormatConfig?.name}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExporter;
