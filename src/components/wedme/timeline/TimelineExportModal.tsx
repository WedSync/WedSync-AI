'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  WeddingTimeline,
  TimelineEvent,
  TimelineExport,
} from '@/types/timeline';
import { useHaptic } from '@/hooks/useTouch';
import {
  FileText,
  Image,
  Calendar,
  Download,
  Share2,
  Settings,
  X,
  Check,
  Clock,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Palette,
  Layout,
  Smartphone,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TimelineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: WeddingTimeline;
  events: TimelineEvent[];
  className?: string;
}

interface ExportOptions {
  format: 'pdf' | 'image' | 'calendar';
  includeVendorDetails: boolean;
  includeInternalNotes: boolean;
  includeDescription: boolean;
  layout: 'timeline' | 'agenda' | 'schedule';
  theme: 'elegant' | 'modern' | 'minimal' | 'colorful';
  paperSize: 'A4' | 'Letter' | 'A3';
  imageFormat: 'png' | 'jpeg';
  imageQuality: number;
  calendarFormat: 'ics' | 'google' | 'outlook';
}

const EXPORT_THEMES = {
  elegant: {
    name: 'Elegant',
    colors: { primary: '#6B46C1', secondary: '#EC4899', accent: '#F59E0B' },
    font: 'serif',
  },
  modern: {
    name: 'Modern',
    colors: { primary: '#3B82F6', secondary: '#10B981', accent: '#8B5CF6' },
    font: 'sans-serif',
  },
  minimal: {
    name: 'Minimal',
    colors: { primary: '#374151', secondary: '#6B7280', accent: '#9CA3AF' },
    font: 'monospace',
  },
  colorful: {
    name: 'Colorful',
    colors: { primary: '#EF4444', secondary: '#F59E0B', accent: '#10B981' },
    font: 'sans-serif',
  },
};

export function TimelineExportModal({
  isOpen,
  onClose,
  timeline,
  events,
  className,
}: TimelineExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeVendorDetails: true,
    includeInternalNotes: false,
    includeDescription: true,
    layout: 'timeline',
    theme: 'elegant',
    paperSize: 'A4',
    imageFormat: 'png',
    imageQuality: 0.9,
    calendarFormat: 'ics',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const haptic = useHaptic();
  const previewRef = useRef<HTMLDivElement>(null);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    haptic.medium();

    try {
      switch (exportOptions.format) {
        case 'pdf':
          await exportToPDF();
          break;
        case 'image':
          await exportToImage();
          break;
        case 'calendar':
          await exportToCalendar();
          break;
      }

      haptic.success();
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      haptic.error();
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!previewRef.current) return;

    setExportProgress(25);

    // Create canvas from preview
    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    setExportProgress(50);

    // Create PDF
    const pdf = new jsPDF({
      orientation: exportOptions.paperSize === 'A3' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: exportOptions.paperSize.toLowerCase(),
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    setExportProgress(75);

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Add metadata
    pdf.setProperties({
      title: `${timeline.name} - Wedding Timeline`,
      subject: 'Wedding Timeline',
      author: 'WedMe',
      creator: 'WedMe Timeline Builder',
    });

    setExportProgress(90);

    // Download
    const filename = `${timeline.name.toLowerCase().replace(/\s+/g, '-')}-timeline.pdf`;
    pdf.save(filename);

    setExportProgress(100);
  };

  // Export to Image
  const exportToImage = async () => {
    if (!previewRef.current) return;

    setExportProgress(30);

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    setExportProgress(70);

    // Convert to desired format
    const mimeType =
      exportOptions.imageFormat === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, exportOptions.imageQuality);

    setExportProgress(90);

    // Download
    const link = document.createElement('a');
    link.download = `${timeline.name.toLowerCase().replace(/\s+/g, '-')}-timeline.${exportOptions.imageFormat}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportProgress(100);
  };

  // Export to Calendar
  const exportToCalendar = async () => {
    setExportProgress(25);

    switch (exportOptions.calendarFormat) {
      case 'ics':
        await exportToICS();
        break;
      case 'google':
        await exportToGoogleCalendar();
        break;
      case 'outlook':
        await exportToOutlookCalendar();
        break;
    }

    setExportProgress(100);
  };

  // Export to ICS file
  const exportToICS = async () => {
    const icsEvents = events
      .map((event) => {
        const start = parseISO(event.start_time);
        const end = parseISO(event.end_time);

        return [
          'BEGIN:VEVENT',
          `UID:${event.id}@wedme.com`,
          `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:${event.title}`,
          event.description
            ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`
            : '',
          event.location ? `LOCATION:${event.location}` : '',
          `STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}`,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n');
      })
      .join('\r\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedMe//Timeline Builder//EN',
      `X-WR-CALNAME:${timeline.name}`,
      'X-WR-TIMEZONE:America/New_York',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      icsEvents,
      'END:VCALENDAR',
    ].join('\r\n');

    // Download ICS file
    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${timeline.name.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Export to Google Calendar
  const exportToGoogleCalendar = async () => {
    const baseUrl =
      'https://calendar.google.com/calendar/render?action=TEMPLATE';

    // For multiple events, we'll create the first event and provide instructions
    if (events.length > 0) {
      const event = events[0];
      const params = new URLSearchParams({
        text: event.title,
        dates: `${parseISO(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${parseISO(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        details:
          event.description ||
          `Part of ${timeline.name} wedding timeline. Import the full ICS file for all events.`,
        location: event.location || '',
      });

      window.open(`${baseUrl}&${params.toString()}`, '_blank');

      // Also offer ICS download for complete timeline
      setTimeout(() => {
        if (
          confirm(
            'Would you like to download the complete timeline as an ICS file for importing all events?',
          )
        ) {
          exportToICS();
        }
      }, 2000);
    }
  };

  // Export to Outlook Calendar
  const exportToOutlookCalendar = async () => {
    // Outlook Online supports ICS import, so we'll generate ICS file
    await exportToICS();

    // Provide instructions
    setTimeout(() => {
      alert(
        'ICS file downloaded! To import to Outlook:\n1. Open Outlook\n2. Go to Calendar\n3. Click "Add Calendar" > "Import from file"\n4. Select the downloaded ICS file',
      );
    }, 1000);
  };

  // Generate preview content
  const generatePreviewContent = () => {
    const theme = EXPORT_THEMES[exportOptions.theme];

    return (
      <div
        className={cn(
          'bg-white p-8 font-serif',
          exportOptions.theme === 'modern' && 'font-sans',
          exportOptions.theme === 'minimal' && 'font-mono',
        )}
        style={{
          fontFamily: theme.font,
          color: theme.colors.primary,
          minHeight: '297mm', // A4 height
          width: '210mm', // A4 width
        }}
      >
        {/* Header */}
        <div
          className="text-center mb-8 border-b-2 pb-6"
          style={{ borderColor: theme.colors.secondary }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: theme.colors.primary }}
          >
            {timeline.name}
          </h1>
          <p className="text-xl" style={{ color: theme.colors.secondary }}>
            {format(parseISO(timeline.wedding_date), 'EEEE, MMMM d, yyyy')}
          </p>
          <div
            className="flex justify-center items-center gap-4 mt-4 text-sm"
            style={{ color: theme.colors.accent }}
          >
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {events.length} Events
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(
                parseISO(events[0]?.start_time || timeline.wedding_date),
                'HH:mm',
              )}{' '}
              -
              {format(
                parseISO(
                  events[events.length - 1]?.end_time || timeline.wedding_date,
                ),
                'HH:mm',
              )}
            </span>
          </div>
        </div>

        {/* Events */}
        {exportOptions.layout === 'timeline' && (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Timeline line */}
                {index < events.length - 1 && (
                  <div
                    className="absolute left-4 top-10 w-0.5 h-12"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                )}

                {/* Event marker */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ backgroundColor: theme.colors.secondary }}
                >
                  <Clock className="w-4 h-4 text-white" />
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: theme.colors.primary }}
                    >
                      {event.title}
                    </h3>
                    <span
                      className="text-sm font-medium"
                      style={{ color: theme.colors.accent }}
                    >
                      {format(parseISO(event.start_time), 'HH:mm')} -
                      {format(parseISO(event.end_time), 'HH:mm')}
                    </span>
                  </div>

                  {exportOptions.includeDescription && event.description && (
                    <p
                      className="text-sm mb-2"
                      style={{ color: theme.colors.primary }}
                    >
                      {event.description}
                    </p>
                  )}

                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: theme.colors.accent }}
                  >
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}

                    {exportOptions.includeVendorDetails &&
                      event.vendors &&
                      event.vendors.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.vendors.length} vendor
                          {event.vendors.length > 1 ? 's' : ''}
                        </span>
                      )}
                  </div>

                  {exportOptions.includeVendorDetails &&
                    event.vendors &&
                    event.vendors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {event.vendors.map((vendor, vIndex) => (
                          <div
                            key={vIndex}
                            className="text-xs p-2 rounded"
                            style={{
                              backgroundColor: `${theme.colors.secondary}10`,
                            }}
                          >
                            <span className="font-medium">
                              {vendor.vendor_name}
                            </span>
                            {vendor.role && (
                              <span className="text-gray-600 ml-2">
                                ({vendor.role})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {exportOptions.layout === 'agenda' && (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4"
                style={{ borderColor: theme.colors.accent }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="font-semibold text-lg"
                    style={{ color: theme.colors.primary }}
                  >
                    {event.title}
                  </h3>
                  <div className="text-right">
                    <div
                      className="font-medium"
                      style={{ color: theme.colors.secondary }}
                    >
                      {format(parseISO(event.start_time), 'HH:mm')} -{' '}
                      {format(parseISO(event.end_time), 'HH:mm')}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: theme.colors.accent }}
                    >
                      {Math.round(
                        (parseISO(event.end_time).getTime() -
                          parseISO(event.start_time).getTime()) /
                          60000,
                      )}{' '}
                      min
                    </div>
                  </div>
                </div>

                {exportOptions.includeDescription && event.description && (
                  <p
                    className="text-sm mb-3"
                    style={{ color: theme.colors.primary }}
                  >
                    {event.description}
                  </p>
                )}

                <div
                  className="flex items-center gap-4 text-sm"
                  style={{ color: theme.colors.accent }}
                >
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}

                  {exportOptions.includeVendorDetails &&
                    event.vendors &&
                    event.vendors.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.vendors.map((v) => v.vendor_name).join(', ')}
                      </span>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="mt-12 pt-6 border-t text-center text-sm"
          style={{
            borderColor: theme.colors.accent,
            color: theme.colors.accent,
          }}
        >
          <p>Generated by WedMe Timeline Builder</p>
          <p>{format(new Date(), "MMMM d, yyyy 'at' HH:mm")}</p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const formatTabs = [
    {
      id: 'pdf',
      label: 'PDF',
      icon: FileText,
      description: 'Professional document',
    },
    {
      id: 'image',
      label: 'Image',
      icon: Image,
      description: 'PNG or JPEG file',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      description: 'Import to your calendar',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={cn(
            'w-full max-w-2xl bg-white rounded-t-3xl md:rounded-3xl shadow-xl',
            'max-h-[90vh] overflow-hidden flex flex-col',
            className,
          )}
          initial={{ y: '100%', scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: '100%', scale: 0.95 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Export Timeline
              </h2>
              <p className="text-sm text-gray-600">{timeline.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!previewMode ? (
              <div className="p-6 space-y-6">
                {/* Format Selection */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Export Format
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {formatTabs.map((format) => {
                      const IconComponent = format.icon;
                      const isSelected = exportOptions.format === format.id;

                      return (
                        <button
                          key={format.id}
                          onClick={() => {
                            setExportOptions((prev) => ({
                              ...prev,
                              format: format.id as any,
                            }));
                            haptic.light();
                          }}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[100px]',
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300',
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'w-6 h-6',
                              isSelected ? 'text-purple-600' : 'text-gray-600',
                            )}
                          />
                          <div className="text-center">
                            <div
                              className={cn(
                                'font-medium',
                                isSelected
                                  ? 'text-purple-900'
                                  : 'text-gray-900',
                              )}
                            >
                              {format.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Options based on format */}
                {exportOptions.format === 'pdf' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paper Size
                      </label>
                      <select
                        value={exportOptions.paperSize}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            paperSize: e.target.value as any,
                          }))
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="Letter">Letter (8.5 × 11 in)</option>
                        <option value="A3">A3 (297 × 420 mm)</option>
                      </select>
                    </div>
                  </div>
                )}

                {exportOptions.format === 'image' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Image Format
                        </label>
                        <select
                          value={exportOptions.imageFormat}
                          onChange={(e) =>
                            setExportOptions((prev) => ({
                              ...prev,
                              imageFormat: e.target.value as any,
                            }))
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        >
                          <option value="png">PNG (Best quality)</option>
                          <option value="jpeg">JPEG (Smaller file)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quality
                        </label>
                        <select
                          value={exportOptions.imageQuality}
                          onChange={(e) =>
                            setExportOptions((prev) => ({
                              ...prev,
                              imageQuality: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        >
                          <option value="0.9">High (90%)</option>
                          <option value="0.8">Medium (80%)</option>
                          <option value="0.7">Low (70%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {exportOptions.format === 'calendar' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calendar Format
                    </label>
                    <select
                      value={exportOptions.calendarFormat}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          calendarFormat: e.target.value as any,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="ics">ICS File (Universal)</option>
                      <option value="google">Google Calendar</option>
                      <option value="outlook">Microsoft Outlook</option>
                    </select>
                  </div>
                )}

                {/* Layout Options */}
                {(exportOptions.format === 'pdf' ||
                  exportOptions.format === 'image') && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Layout
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          id: 'timeline',
                          label: 'Timeline View',
                          icon: Layout,
                        },
                        { id: 'agenda', label: 'Agenda View', icon: Calendar },
                      ].map((layout) => {
                        const IconComponent = layout.icon;
                        const isSelected = exportOptions.layout === layout.id;

                        return (
                          <button
                            key={layout.id}
                            onClick={() => {
                              setExportOptions((prev) => ({
                                ...prev,
                                layout: layout.id as any,
                              }));
                              haptic.light();
                            }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                              isSelected
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-gray-300',
                            )}
                          >
                            <IconComponent
                              className={cn(
                                'w-5 h-5',
                                isSelected
                                  ? 'text-purple-600'
                                  : 'text-gray-600',
                              )}
                            />
                            <span
                              className={cn(
                                'font-medium',
                                isSelected
                                  ? 'text-purple-900'
                                  : 'text-gray-900',
                              )}
                            >
                              {layout.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Theme Selection */}
                {(exportOptions.format === 'pdf' ||
                  exportOptions.format === 'image') && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Theme
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(EXPORT_THEMES).map(([key, theme]) => {
                        const isSelected = exportOptions.theme === key;

                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setExportOptions((prev) => ({
                                ...prev,
                                theme: key as any,
                              }));
                              haptic.light();
                            }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                              isSelected
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-gray-300',
                            )}
                          >
                            <div className="flex gap-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: theme.colors.primary,
                                }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: theme.colors.secondary,
                                }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.colors.accent }}
                              />
                            </div>
                            <span
                              className={cn(
                                'font-medium',
                                isSelected
                                  ? 'text-purple-900'
                                  : 'text-gray-900',
                              )}
                            >
                              {theme.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Content Options */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Include
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'includeDescription',
                        label: 'Event descriptions',
                        icon: FileText,
                      },
                      {
                        key: 'includeVendorDetails',
                        label: 'Vendor information',
                        icon: Users,
                      },
                      {
                        key: 'includeInternalNotes',
                        label: 'Internal notes',
                        icon: EyeOff,
                      },
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.key}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {option.label}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={
                                exportOptions[
                                  option.key as keyof ExportOptions
                                ] as boolean
                              }
                              onChange={(e) =>
                                setExportOptions((prev) => ({
                                  ...prev,
                                  [option.key]: e.target.checked,
                                }))
                              }
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Preview Content */
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Preview</h3>
                  <div className="text-sm text-gray-500">
                    {exportOptions.format.toUpperCase()} • {exportOptions.theme}{' '}
                    theme • {exportOptions.layout} layout
                  </div>
                </div>
                <div
                  ref={previewRef}
                  className="border rounded-lg overflow-hidden bg-white shadow-sm"
                  style={{
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    width: '200%',
                    height: '200%',
                  }}
                >
                  {generatePreviewContent()}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPreviewMode(!previewMode);
                  haptic.light();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium min-h-[48px]"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit Options' : 'Preview'}
              </button>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium min-h-[48px]',
                  isExporting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600',
                )}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting... {Math.round(exportProgress)}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export {exportOptions.format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
