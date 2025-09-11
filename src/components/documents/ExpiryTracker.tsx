'use client';

/**
 * Expiry Tracker Component
 * Monitors and alerts for document expiry dates with automated compliance tracking
 * WS-068: Wedding Business Compliance Hub
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  RefreshCw,
  TrendingUp,
  Target,
  AlertCircle,
  Info,
  ArrowRight,
  Plus,
  Edit3,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  DocumentWithCategory,
  ExpiringDocument,
  DocumentComplianceAlert,
  ComplianceStatus,
  ExpiryTrackerProps,
  COMPLIANCE_STATUS_INFO,
} from '@/types/documents';

interface ExpirySettings {
  documentId: string;
  expiryDate: string;
  warningDays: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export function ExpiryTracker({
  documents,
  onRenew,
  onSetAlert,
  compact = false,
}: ExpiryTrackerProps) {
  const [expiringDocuments, setExpiringDocuments] = useState<
    ExpiringDocument[]
  >([]);
  const [alerts, setAlerts] = useState<DocumentComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentWithCategory | null>(null);
  const [alertSettings, setAlertSettings] = useState<ExpirySettings>({
    documentId: '',
    expiryDate: '',
    warningDays: 30,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
  });

  // Load expiring documents and alerts
  useEffect(() => {
    loadExpiryData();
  }, [documents]);

  const loadExpiryData = async () => {
    try {
      setLoading(true);

      // Filter and sort documents by expiry
      const documentsWithExpiry = documents
        .filter((doc) => doc.expiry_date)
        .map((doc) => ({
          ...doc,
          days_until_expiry: differenceInDays(
            parseISO(doc.expiry_date!),
            new Date(),
          ),
        }))
        .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

      setExpiringDocuments(documentsWithExpiry as ExpiringDocument[]);

      // TODO: Load alerts from service
      // const alertsData = await documentStorageService.getComplianceAlerts(userId);
      // setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load expiry data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categorize documents by expiry status
  const expiryCategories = useMemo(() => {
    const expired = expiringDocuments.filter(
      (doc) => doc.days_until_expiry < 0,
    );
    const critical = expiringDocuments.filter(
      (doc) => doc.days_until_expiry >= 0 && doc.days_until_expiry <= 7,
    );
    const warning = expiringDocuments.filter(
      (doc) => doc.days_until_expiry > 7 && doc.days_until_expiry <= 30,
    );
    const upcoming = expiringDocuments.filter(
      (doc) => doc.days_until_expiry > 30 && doc.days_until_expiry <= 90,
    );

    return { expired, critical, warning, upcoming };
  }, [expiringDocuments]);

  // Calculate compliance metrics
  const complianceMetrics = useMemo(() => {
    const totalWithExpiry = expiringDocuments.length;
    const expiredCount = expiryCategories.expired.length;
    const expiringCount =
      expiryCategories.critical.length + expiryCategories.warning.length;
    const complianceRate =
      totalWithExpiry > 0
        ? ((totalWithExpiry - expiredCount) / totalWithExpiry) * 100
        : 100;

    return {
      totalWithExpiry,
      expiredCount,
      expiringCount,
      complianceRate: Math.round(complianceRate),
      nextExpiry: expiringDocuments.find((doc) => doc.days_until_expiry >= 0),
    };
  }, [expiringDocuments, expiryCategories]);

  const getExpiryStatusInfo = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) {
      return {
        status: 'expired' as ComplianceStatus,
        color: '#EF4444',
        icon: XCircle,
        urgency: 'critical',
        label: `Expired ${Math.abs(daysUntilExpiry)} days ago`,
      };
    } else if (daysUntilExpiry <= 7) {
      return {
        status: 'expiring' as ComplianceStatus,
        color: '#EF4444',
        icon: AlertTriangle,
        urgency: 'critical',
        label:
          daysUntilExpiry === 0
            ? 'Expires today'
            : `Expires in ${daysUntilExpiry} days`,
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring' as ComplianceStatus,
        color: '#F59E0B',
        icon: Clock,
        urgency: 'warning',
        label: `Expires in ${daysUntilExpiry} days`,
      };
    } else {
      return {
        status: 'valid' as ComplianceStatus,
        color: '#10B981',
        icon: CheckCircle,
        urgency: 'normal',
        label: `Expires in ${daysUntilExpiry} days`,
      };
    }
  };

  const handleSetupAlert = (document: DocumentWithCategory) => {
    setSelectedDocument(document);
    setAlertSettings({
      documentId: document.id,
      expiryDate: document.expiry_date || '',
      warningDays: document.expiry_warning_days || 30,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
    });
    setShowSettings(true);
  };

  const handleSaveAlertSettings = async () => {
    try {
      if (!selectedDocument) return;

      await documentStorageService.updateExpiryTracking(
        alertSettings.documentId,
        'current-user-id', // TODO: Get from auth context
        alertSettings.expiryDate,
        alertSettings.warningDays,
      );

      onSetAlert?.(selectedDocument.id);
      setShowSettings(false);
      await loadExpiryData();
    } catch (error) {
      console.error('Failed to save alert settings:', error);
    }
  };

  const ExpiryCard = ({ document }: { document: ExpiringDocument }) => {
    const statusInfo = getExpiryStatusInfo(document.days_until_expiry);
    const IconComponent = statusInfo.icon;

    return (
      <Card
        className={`border-l-4 hover:shadow-md transition-shadow ${
          statusInfo.urgency === 'critical'
            ? 'border-l-red-500 bg-red-50'
            : statusInfo.urgency === 'warning'
              ? 'border-l-yellow-500 bg-yellow-50'
              : 'border-l-green-500 bg-green-50'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${statusInfo.color}20` }}
              >
                <IconComponent
                  className="w-5 h-5"
                  style={{ color: statusInfo.color }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">
                  {document.title || document.original_filename}
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  {document.category_name}
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Expires:</span>
                    <span
                      className={`font-medium ${
                        statusInfo.urgency === 'critical'
                          ? 'text-red-600'
                          : statusInfo.urgency === 'warning'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {format(parseISO(document.expiry_date!), 'MMM dd, yyyy')}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      color: statusInfo.color,
                      borderColor: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetupAlert(document)}
                className="p-1 h-6 w-6"
                title="Configure alerts"
              >
                <Settings className="h-3 w-3" />
              </Button>

              {onRenew && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRenew(document.id)}
                  className="p-1 h-6 w-6"
                  title="Renew document"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-600">
                {expiryCategories.expired.length}
              </p>
              <p className="text-xs text-gray-600">Expired</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {expiryCategories.critical.length +
                  expiryCategories.warning.length}
              </p>
              <p className="text-xs text-gray-600">Expiring</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {complianceMetrics.complianceRate}%
              </p>
              <p className="text-xs text-gray-600">Compliant</p>
            </div>
          </div>

          {complianceMetrics.nextExpiry && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                Next expiry:{' '}
                {complianceMetrics.nextExpiry.title ||
                  complianceMetrics.nextExpiry.original_filename}
              </p>
              <p className="text-xs text-yellow-600">
                {format(
                  parseISO(complianceMetrics.nextExpiry.expiry_date!),
                  'MMM dd, yyyy',
                )}
                ({complianceMetrics.nextExpiry.days_until_expiry} days)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {complianceMetrics.complianceRate}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress
              value={complianceMetrics.complianceRate}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {expiryCategories.expired.length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {expiryCategories.critical.length +
                    expiryCategories.warning.length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tracked</p>
                <p className="text-2xl font-bold">
                  {complianceMetrics.totalWithExpiry}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and critical items */}
      {(expiryCategories.expired.length > 0 ||
        expiryCategories.critical.length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Urgent Action Required:</strong>{' '}
            {expiryCategories.expired.length} expired documents and{' '}
            {expiryCategories.critical.length} expiring within 7 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Expiry categories */}
      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="critical" className="text-red-600">
            Critical (
            {expiryCategories.expired.length + expiryCategories.critical.length}
            )
          </TabsTrigger>
          <TabsTrigger value="warning" className="text-yellow-600">
            Warning ({expiryCategories.warning.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-blue-600">
            Upcoming ({expiryCategories.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({expiringDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical" className="space-y-4">
          <div className="space-y-3">
            {[...expiryCategories.expired, ...expiryCategories.critical].map(
              (document) => (
                <ExpiryCard key={document.id} document={document} />
              ),
            )}
            {expiryCategories.expired.length === 0 &&
              expiryCategories.critical.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">No critical expiry issues</p>
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          <div className="space-y-3">
            {expiryCategories.warning.map((document) => (
              <ExpiryCard key={document.id} document={document} />
            ))}
            {expiryCategories.warning.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  No documents expiring in the next 30 days
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="space-y-3">
            {expiryCategories.upcoming.map((document) => (
              <ExpiryCard key={document.id} document={document} />
            ))}
            {expiryCategories.upcoming.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  No upcoming expiries in the next 90 days
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="space-y-3">
            {expiringDocuments.map((document) => (
              <ExpiryCard key={document.id} document={document} />
            ))}
            {expiringDocuments.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No documents with expiry dates</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Expiry Alerts</DialogTitle>
            <DialogDescription>
              Set up automated alerts for{' '}
              {selectedDocument?.title || selectedDocument?.original_filename}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={alertSettings.expiryDate}
                onChange={(e) =>
                  setAlertSettings((prev) => ({
                    ...prev,
                    expiryDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Warning Days Before Expiry</Label>
              <Select
                value={alertSettings.warningDays.toString()}
                onValueChange={(value) =>
                  setAlertSettings((prev) => ({
                    ...prev,
                    warningDays: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Notification Methods</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-alerts"
                  checked={alertSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      emailEnabled: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="email-alerts">Email alerts</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms-alerts"
                  checked={alertSettings.smsEnabled}
                  onCheckedChange={(checked) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      smsEnabled: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="sms-alerts">SMS alerts</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push-alerts"
                  checked={alertSettings.pushEnabled}
                  onCheckedChange={(checked) =>
                    setAlertSettings((prev) => ({
                      ...prev,
                      pushEnabled: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="push-alerts">Push notifications</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAlertSettings}>Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Helpful information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Compliance Tracking Tips
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Set up alerts 30-60 days before important documents expire
                </li>
                <li>
                  • Keep digital copies of renewal receipts and confirmations
                </li>
                <li>
                  • Review compliance status monthly to stay ahead of deadlines
                </li>
                <li>
                  • Use categories to group similar compliance requirements
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
