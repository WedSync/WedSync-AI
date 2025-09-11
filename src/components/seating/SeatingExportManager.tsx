'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  FileText,
  Image,
  Share2,
  Mail,
  Link,
  Copy,
  Eye,
  Settings,
  Printer,
  Users,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Guest {
  id: string;
  name: string;
  email: string;
  dietaryRequirements?: string[];
  accessibilityNeeds?: string[];
  category?: string;
  side?: string;
  tableId?: string;
  seatNumber?: number;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  guests: Guest[];
  x: number;
  y: number;
  isVip?: boolean;
}

interface ExportOptions {
  format: 'pdf' | 'png' | 'jpg' | 'csv' | 'json';
  includeGuestDetails: boolean;
  includeDietaryInfo: boolean;
  includeAccessibilityInfo: boolean;
  includeTableLayout: boolean;
  includeStatistics: boolean;
  includeBranding: boolean;
  watermark: boolean;
  customTitle?: string;
  customMessage?: string;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'color' | 'grayscale' | 'high-contrast';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
}

interface VendorShareOptions {
  shareWith: string[];
  accessLevel: 'view' | 'comment' | 'edit';
  expirationDate?: Date;
  includeVendorNotes: boolean;
  allowDownload: boolean;
  requirePassword: boolean;
  password?: string;
  customMessage?: string;
}

interface SeatingExportManagerProps {
  guests: Guest[];
  tables: Table[];
  weddingTitle: string;
  weddingDate: Date;
  venue: string;
  className?: string;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'pdf',
  includeGuestDetails: true,
  includeDietaryInfo: true,
  includeAccessibilityInfo: true,
  includeTableLayout: true,
  includeStatistics: true,
  includeBranding: true,
  watermark: false,
  fontSize: 'medium',
  colorScheme: 'color',
  paperSize: 'A4',
  orientation: 'portrait',
};

const DEFAULT_SHARE_OPTIONS: VendorShareOptions = {
  shareWith: [],
  accessLevel: 'view',
  includeVendorNotes: false,
  allowDownload: true,
  requirePassword: false,
};

export function SeatingExportManager({
  guests,
  tables,
  weddingTitle,
  weddingDate,
  venue,
  className,
}: SeatingExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [shareOptions, setShareOptions] = useState<VendorShareOptions>(
    DEFAULT_SHARE_OPTIONS,
  );
  const [shareLink, setShareLink] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Calculate statistics
  const statistics = {
    totalGuests: guests.length,
    assignedGuests: guests.filter((g) => g.tableId).length,
    totalTables: tables.length,
    usedTables: tables.filter((t) => t.guests.length > 0).length,
    averageTableSize:
      tables
        .filter((t) => t.guests.length > 0)
        .reduce((sum, t) => sum + t.guests.length, 0) /
        tables.filter((t) => t.guests.length > 0).length || 0,
    dietaryRestrictions: guests.filter((g) => g.dietaryRequirements?.length)
      .length,
    accessibilityNeeds: guests.filter((g) => g.accessibilityNeeds?.length)
      .length,
  };

  // Generate PDF export
  const generatePDF = useCallback(async () => {
    if (!previewRef.current) return null;

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      allowTaint: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: exportOptions.orientation,
      unit: 'mm',
      format: exportOptions.paperSize.toLowerCase(),
    });

    const imgWidth = exportOptions.orientation === 'portrait' ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    if (exportOptions.watermark) {
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(60);
      pdf.text('DRAFT', imgWidth / 2, imgHeight / 2, {
        angle: 45,
        align: 'center',
      });
    }

    return pdf;
  }, [exportOptions]);

  // Generate CSV export
  const generateCSV = useCallback(() => {
    const headers = ['Table Name', 'Guest Name', 'Email', 'Seat Number'];

    if (exportOptions.includeDietaryInfo) {
      headers.push('Dietary Requirements');
    }

    if (exportOptions.includeAccessibilityInfo) {
      headers.push('Accessibility Needs');
    }

    headers.push('Category', 'Side');

    const rows = [headers];

    tables.forEach((table) => {
      if (table.guests.length > 0) {
        table.guests.forEach((guest) => {
          const row = [
            table.name,
            guest.name,
            guest.email,
            guest.seatNumber?.toString() || '',
          ];

          if (exportOptions.includeDietaryInfo) {
            row.push(guest.dietaryRequirements?.join(', ') || '');
          }

          if (exportOptions.includeAccessibilityInfo) {
            row.push(guest.accessibilityNeeds?.join(', ') || '');
          }

          row.push(guest.category || '', guest.side || '');
          rows.push(row);
        });
      } else {
        const row = [table.name, '', '', ''];
        if (exportOptions.includeDietaryInfo) row.push('');
        if (exportOptions.includeAccessibilityInfo) row.push('');
        row.push('', '');
        rows.push(row);
      }
    });

    return rows.map((row) => row.join(',')).join('\n');
  }, [tables, exportOptions]);

  // Generate JSON export
  const generateJSON = useCallback(() => {
    const data = {
      wedding: {
        title: weddingTitle,
        date: weddingDate.toISOString(),
        venue,
      },
      tables: tables.map((table) => ({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        shape: table.shape,
        position: { x: table.x, y: table.y },
        isVip: table.isVip,
        guests: table.guests.map((guest) => ({
          id: guest.id,
          name: guest.name,
          email: exportOptions.includeGuestDetails ? guest.email : undefined,
          seatNumber: guest.seatNumber,
          dietaryRequirements: exportOptions.includeDietaryInfo
            ? guest.dietaryRequirements
            : undefined,
          accessibilityNeeds: exportOptions.includeAccessibilityInfo
            ? guest.accessibilityNeeds
            : undefined,
          category: guest.category,
          side: guest.side,
        })),
      })),
      statistics: exportOptions.includeStatistics ? statistics : undefined,
      exportedAt: new Date().toISOString(),
      exportOptions,
    };

    return JSON.stringify(data, null, 2);
  }, [tables, weddingTitle, weddingDate, venue, exportOptions, statistics]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      let content: string | Blob;
      let filename = `seating-chart-${weddingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;

      switch (exportOptions.format) {
        case 'pdf':
          const pdf = await generatePDF();
          if (!pdf) throw new Error('Failed to generate PDF');

          pdf.save(`${filename}.pdf`);
          break;

        case 'png':
        case 'jpg':
          if (!previewRef.current) throw new Error('Preview not available');

          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            backgroundColor: exportOptions.format === 'jpg' ? '#ffffff' : null,
          });

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${exportOptions.format}`;
                a.click();
                URL.revokeObjectURL(url);
              }
            },
            `image/${exportOptions.format}`,
            0.9,
          );
          break;

        case 'csv':
          content = generateCSV();
          const csvBlob = new Blob([content], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = `${filename}.csv`;
          csvLink.click();
          URL.revokeObjectURL(csvUrl);
          break;

        case 'json':
          content = generateJSON();
          const jsonBlob = new Blob([content], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `${filename}.json`;
          jsonLink.click();
          URL.revokeObjectURL(jsonUrl);
          break;
      }

      toast({
        title: 'Export Complete',
        description: `Seating chart exported as ${exportOptions.format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export seating chart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    exportOptions,
    generatePDF,
    generateCSV,
    generateJSON,
    weddingTitle,
    toast,
  ]);

  // Handle vendor sharing
  const handleShare = useCallback(async () => {
    setIsSharing(true);

    try {
      // In a real implementation, this would create a shared link via API
      const shareData = {
        tables,
        guests:
          shareOptions.accessLevel === 'view'
            ? guests.map((g) => ({ ...g, email: undefined }))
            : guests,
        wedding: { title: weddingTitle, date: weddingDate, venue },
        options: shareOptions,
        createdAt: new Date().toISOString(),
        expiresAt: shareOptions.expirationDate?.toISOString(),
      };

      // Simulate API call
      const response = await fetch('/api/seating/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) throw new Error('Failed to create share link');

      const { shareId, link } = await response.json();
      setShareLink(link);

      toast({
        title: 'Share Link Created',
        description: 'Seating chart has been shared with selected vendors',
      });
    } catch (error) {
      console.error('Sharing failed:', error);
      toast({
        title: 'Sharing Failed',
        description: 'Failed to create share link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  }, [tables, guests, weddingTitle, weddingDate, venue, shareOptions, toast]);

  // Copy share link
  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  }, [shareLink, toast]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export & Share
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export & Share Seating Chart</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value: any) =>
                    setExportOptions((prev) => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="png">PNG Image</SelectItem>
                    <SelectItem value="jpg">JPG Image</SelectItem>
                    <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                    <SelectItem value="json">JSON Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Options */}
              <div className="space-y-3">
                <Label>Include in Export</Label>
                <div className="space-y-2">
                  {[
                    {
                      key: 'includeGuestDetails',
                      label: 'Guest contact details',
                    },
                    {
                      key: 'includeDietaryInfo',
                      label: 'Dietary requirements',
                    },
                    {
                      key: 'includeAccessibilityInfo',
                      label: 'Accessibility needs',
                    },
                    { key: 'includeTableLayout', label: 'Visual table layout' },
                    { key: 'includeStatistics', label: 'Seating statistics' },
                    { key: 'includeBranding', label: 'WedSync branding' },
                    { key: 'watermark', label: 'Draft watermark' },
                  ].map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={option.key}
                        checked={
                          exportOptions[
                            option.key as keyof ExportOptions
                          ] as boolean
                        }
                        onCheckedChange={(checked) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            [option.key]: checked,
                          }))
                        }
                      />
                      <Label htmlFor={option.key} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select
                    value={exportOptions.paperSize}
                    onValueChange={(value: any) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        paperSize: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={exportOptions.orientation}
                    onValueChange={(value: any) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        orientation: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Title */}
              <div className="space-y-2">
                <Label>Custom Title (optional)</Label>
                <Input
                  value={exportOptions.customTitle || ''}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      customTitle: e.target.value,
                    }))
                  }
                  placeholder="Custom title for the seating chart"
                />
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {exportOptions.format.toUpperCase()}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Vendor Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="h-5 w-5 mr-2" />
                Share with Vendors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vendor Emails */}
              <div className="space-y-2">
                <Label>Vendor Email Addresses</Label>
                <Textarea
                  placeholder="Enter vendor email addresses, one per line"
                  value={shareOptions.shareWith.join('\n')}
                  onChange={(e) =>
                    setShareOptions((prev) => ({
                      ...prev,
                      shareWith: e.target.value
                        .split('\n')
                        .filter((email) => email.trim()),
                    }))
                  }
                  rows={4}
                />
              </div>

              {/* Access Level */}
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={shareOptions.accessLevel}
                  onValueChange={(value: any) =>
                    setShareOptions((prev) => ({ ...prev, accessLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="comment">View & Comment</SelectItem>
                    <SelectItem value="edit">Full Edit Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sharing Options */}
              <div className="space-y-3">
                <Label>Sharing Options</Label>
                <div className="space-y-2">
                  {[
                    {
                      key: 'includeVendorNotes',
                      label: 'Include vendor notes section',
                    },
                    {
                      key: 'allowDownload',
                      label: 'Allow vendors to download',
                    },
                    {
                      key: 'requirePassword',
                      label: 'Require password to access',
                    },
                  ].map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={option.key}
                        checked={
                          shareOptions[
                            option.key as keyof VendorShareOptions
                          ] as boolean
                        }
                        onCheckedChange={(checked) =>
                          setShareOptions((prev) => ({
                            ...prev,
                            [option.key]: checked,
                          }))
                        }
                      />
                      <Label htmlFor={option.key} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Password */}
              {shareOptions.requirePassword && (
                <div className="space-y-2">
                  <Label>Access Password</Label>
                  <Input
                    type="password"
                    value={shareOptions.password || ''}
                    onChange={(e) =>
                      setShareOptions((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Enter access password"
                  />
                </div>
              )}

              {/* Custom Message */}
              <div className="space-y-2">
                <Label>Custom Message (optional)</Label>
                <Textarea
                  value={shareOptions.customMessage || ''}
                  onChange={(e) =>
                    setShareOptions((prev) => ({
                      ...prev,
                      customMessage: e.target.value,
                    }))
                  }
                  placeholder="Message to include with the shared link"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleShare}
                disabled={isSharing || shareOptions.shareWith.length === 0}
                className="w-full"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Creating Share Link...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share with Vendors
                  </>
                )}
              </Button>

              {/* Share Link Display */}
              {shareLink && (
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex space-x-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button
                      onClick={copyShareLink}
                      size="icon"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Link expires:{' '}
                    {shareOptions.expirationDate?.toLocaleDateString() ||
                      'Never'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        {previewMode && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Export Preview</h3>
              <Button onClick={() => setPreviewMode(false)} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Hide Preview
              </Button>
            </div>

            <div
              ref={previewRef}
              className={cn(
                'border rounded-lg p-6 bg-white',
                exportOptions.colorScheme === 'grayscale' && 'grayscale',
                exportOptions.colorScheme === 'high-contrast' && 'contrast-125',
                exportOptions.fontSize === 'small' && 'text-sm',
                exportOptions.fontSize === 'large' && 'text-lg',
              )}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">
                  {exportOptions.customTitle ||
                    `${weddingTitle} - Seating Chart`}
                </h1>
                <div className="text-muted-foreground">
                  <p>{weddingDate.toLocaleDateString()}</p>
                  <p>{venue}</p>
                </div>
              </div>

              {/* Statistics */}
              {exportOptions.includeStatistics && (
                <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {statistics.totalGuests}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Guests
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {statistics.usedTables}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tables Used
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round(statistics.averageTableSize)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Table Size
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round(
                        (statistics.assignedGuests / statistics.totalGuests) *
                          100,
                      )}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Assigned
                    </div>
                  </div>
                </div>
              )}

              {/* Table List */}
              <div className="space-y-4">
                {tables
                  .filter((t) => t.guests.length > 0)
                  .map((table) => (
                    <div key={table.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          {table.name}
                          {table.isVip && <Badge className="ml-2">VIP</Badge>}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {table.guests.length} guests
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {table.guests.map((guest) => (
                          <div key={guest.id} className="text-sm">
                            <div className="font-medium">{guest.name}</div>
                            {exportOptions.includeDietaryInfo &&
                              guest.dietaryRequirements?.length && (
                                <div className="text-orange-600 text-xs">
                                  Dietary:{' '}
                                  {guest.dietaryRequirements.join(', ')}
                                </div>
                              )}
                            {exportOptions.includeAccessibilityInfo &&
                              guest.accessibilityNeeds?.length && (
                                <div className="text-blue-600 text-xs">
                                  Accessibility:{' '}
                                  {guest.accessibilityNeeds.join(', ')}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Footer */}
              {exportOptions.includeBranding && (
                <div className="text-center mt-6 text-sm text-muted-foreground">
                  Generated by WedSync • {new Date().toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {!previewMode && (
          <div className="mt-6 text-center">
            <Button onClick={() => setPreviewMode(true)} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Show Preview
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
