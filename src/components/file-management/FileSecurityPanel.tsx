'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Lock,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  Download,
  Share2,
  Trash2,
  History,
  UserCheck,
  Globe,
  Calendar,
  Database,
  Zap,
} from 'lucide-react';
import { FileSystemFile, WeddingContext } from '@/types/file-management';
import { cn } from '@/lib/utils';

interface FileSecurityPanelProps {
  file: FileSystemFile;
  organizationId: string;
  currentUserId: string;
  onSecurityUpdate: (fileId: string, settings: FileSecuritySettings) => void;
  onAuditLog: (action: AuditAction) => void;
}

interface FileSecuritySettings {
  accessLevel: 'private' | 'organization' | 'public' | 'restricted';
  allowedUsers: string[];
  allowedRoles: string[];
  permissions: {
    view: boolean;
    download: boolean;
    share: boolean;
    edit: boolean;
    delete: boolean;
  };
  expiryDate?: Date;
  requireAuthentication: boolean;
  allowedDomains: string[];
  watermarkEnabled: boolean;
  downloadTracking: boolean;
  geoRestrictions: string[];
  dataRetentionPeriod: number; // days
  gdprCompliant: boolean;
  encryptionRequired: boolean;
}

interface AuditAction {
  fileId: string;
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  additionalInfo?: Record<string, any>;
}

interface SecurityViolation {
  id: string;
  type:
    | 'unauthorized_access'
    | 'suspicious_download'
    | 'policy_violation'
    | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

const DEFAULT_SECURITY_SETTINGS: FileSecuritySettings = {
  accessLevel: 'organization',
  allowedUsers: [],
  allowedRoles: ['admin', 'editor'],
  permissions: {
    view: true,
    download: true,
    share: false,
    edit: false,
    delete: false,
  },
  requireAuthentication: true,
  allowedDomains: [],
  watermarkEnabled: false,
  downloadTracking: true,
  geoRestrictions: [],
  dataRetentionPeriod: 2555, // 7 years default for wedding files
  gdprCompliant: true,
  encryptionRequired: false,
};

export default function FileSecurityPanel({
  file,
  organizationId,
  currentUserId,
  onSecurityUpdate,
  onAuditLog,
}: FileSecurityPanelProps) {
  const [securitySettings, setSecuritySettings] =
    useState<FileSecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditAction[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<{
    gdpr: boolean;
    retention: boolean;
    encryption: boolean;
    access: boolean;
  }>({ gdpr: true, retention: true, encryption: false, access: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, [file.id]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load existing security settings
      const settings = await fetchFileSecuritySettings(file.id);
      setSecuritySettings(settings || DEFAULT_SECURITY_SETTINGS);

      // Load audit logs
      const logs = await fetchAuditLogs(file.id);
      setAuditLogs(logs);

      // Load security violations
      const fileViolations = await fetchSecurityViolations(file.id);
      setViolations(fileViolations);

      // Check compliance status
      const compliance = await checkComplianceStatus(
        file.id,
        settings || DEFAULT_SECURITY_SETTINGS,
      );
      setComplianceStatus(compliance);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async (
    newSettings: Partial<FileSecuritySettings>,
  ) => {
    const updatedSettings = { ...securitySettings, ...newSettings };
    setSecuritySettings(updatedSettings);

    try {
      await onSecurityUpdate(file.id, updatedSettings);

      // Log the security change
      onAuditLog({
        fileId: file.id,
        userId: currentUserId,
        action: 'security_settings_updated',
        timestamp: new Date(),
        additionalInfo: { changes: newSettings },
      });

      // Recheck compliance
      const compliance = await checkComplianceStatus(file.id, updatedSettings);
      setComplianceStatus(compliance);
    } catch (error) {
      console.error('Failed to update security settings:', error);
    }
  };

  const generateSecureLink = async () => {
    try {
      const link = await createSecureShareLink(file.id, {
        expiresIn: securitySettings.expiryDate,
        requireAuth: securitySettings.requireAuthentication,
        allowedDomains: securitySettings.allowedDomains,
        permissions: securitySettings.permissions,
      });

      onAuditLog({
        fileId: file.id,
        userId: currentUserId,
        action: 'secure_link_generated',
        timestamp: new Date(),
        additionalInfo: { linkId: link.id },
      });

      return link;
    } catch (error) {
      console.error('Failed to generate secure link:', error);
      throw error;
    }
  };

  const revokeAccess = async (userId: string) => {
    const updatedUsers = securitySettings.allowedUsers.filter(
      (id) => id !== userId,
    );
    await updateSecuritySettings({ allowedUsers: updatedUsers });

    onAuditLog({
      fileId: file.id,
      userId: currentUserId,
      action: 'access_revoked',
      timestamp: new Date(),
      additionalInfo: { revokedUserId: userId },
    });
  };

  const resolveViolation = async (violationId: string) => {
    const updatedViolations = violations.map((v) =>
      v.id === violationId ? { ...v, resolved: true } : v,
    );
    setViolations(updatedViolations);

    onAuditLog({
      fileId: file.id,
      userId: currentUserId,
      action: 'violation_resolved',
      timestamp: new Date(),
      additionalInfo: { violationId },
    });
  };

  const getSecurityScore = () => {
    let score = 0;
    if (securitySettings.requireAuthentication) score += 20;
    if (securitySettings.encryptionRequired) score += 25;
    if (securitySettings.downloadTracking) score += 15;
    if (securitySettings.watermarkEnabled) score += 10;
    if (securitySettings.accessLevel === 'restricted') score += 20;
    if (securitySettings.expiryDate) score += 10;
    return Math.min(100, score);
  };

  const getComplianceIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const securityScore = getSecurityScore();

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Security Overview
            </div>
            <Badge
              variant={
                securityScore >= 80
                  ? 'default'
                  : securityScore >= 60
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-sm"
            >
              {securityScore}% Secure
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {getComplianceIcon(complianceStatus.gdpr)}
              <span className="text-sm">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              {getComplianceIcon(complianceStatus.encryption)}
              <span className="text-sm">Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              {getComplianceIcon(complianceStatus.access)}
              <span className="text-sm">Access Controlled</span>
            </div>
            <div className="flex items-center gap-2">
              {getComplianceIcon(complianceStatus.retention)}
              <span className="text-sm">Retention Policy</span>
            </div>
          </div>

          {violations.filter((v) => !v.resolved).length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {violations.filter((v) => !v.resolved).length} unresolved
                security violation(s) detected. Review the Security Violations
                tab.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Configuration */}
      <Tabs defaultValue="access" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="sharing">Secure Sharing</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Access Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>File Access Level</Label>
                <Select
                  value={securitySettings.accessLevel}
                  onValueChange={(value) =>
                    updateSecuritySettings({ accessLevel: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Private (Owner Only)
                      </div>
                    </SelectItem>
                    <SelectItem value="restricted">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Restricted (Specified Users)
                      </div>
                    </SelectItem>
                    <SelectItem value="organization">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Organization
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Public (Anyone with link)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="view-permission" className="text-sm">
                    View
                  </Label>
                  <Switch
                    id="view-permission"
                    checked={securitySettings.permissions.view}
                    onCheckedChange={(checked) =>
                      updateSecuritySettings({
                        permissions: {
                          ...securitySettings.permissions,
                          view: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="download-permission" className="text-sm">
                    Download
                  </Label>
                  <Switch
                    id="download-permission"
                    checked={securitySettings.permissions.download}
                    onCheckedChange={(checked) =>
                      updateSecuritySettings({
                        permissions: {
                          ...securitySettings.permissions,
                          download: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-permission" className="text-sm">
                    Share
                  </Label>
                  <Switch
                    id="share-permission"
                    checked={securitySettings.permissions.share}
                    onCheckedChange={(checked) =>
                      updateSecuritySettings({
                        permissions: {
                          ...securitySettings.permissions,
                          share: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-permission" className="text-sm">
                    Edit
                  </Label>
                  <Switch
                    id="edit-permission"
                    checked={securitySettings.permissions.edit}
                    onCheckedChange={(checked) =>
                      updateSecuritySettings({
                        permissions: {
                          ...securitySettings.permissions,
                          edit: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="delete-permission" className="text-sm">
                    Delete
                  </Label>
                  <Switch
                    id="delete-permission"
                    checked={securitySettings.permissions.delete}
                    onCheckedChange={(checked) =>
                      updateSecuritySettings({
                        permissions: {
                          ...securitySettings.permissions,
                          delete: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Security Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auth-required">
                        Require Authentication
                      </Label>
                      <p className="text-xs text-gray-600">
                        Users must be logged in to access
                      </p>
                    </div>
                    <Switch
                      id="auth-required"
                      checked={securitySettings.requireAuthentication}
                      onCheckedChange={(checked) =>
                        updateSecuritySettings({
                          requireAuthentication: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="watermark">Enable Watermark</Label>
                      <p className="text-xs text-gray-600">
                        Add organization watermark to images
                      </p>
                    </div>
                    <Switch
                      id="watermark"
                      checked={securitySettings.watermarkEnabled}
                      onCheckedChange={(checked) =>
                        updateSecuritySettings({ watermarkEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="download-tracking">
                        Download Tracking
                      </Label>
                      <p className="text-xs text-gray-600">
                        Track who downloads this file
                      </p>
                    </div>
                    <Switch
                      id="download-tracking"
                      checked={securitySettings.downloadTracking}
                      onCheckedChange={(checked) =>
                        updateSecuritySettings({ downloadTracking: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="encryption">Require Encryption</Label>
                      <p className="text-xs text-gray-600">
                        Encrypt file data at rest and in transit
                      </p>
                    </div>
                    <Switch
                      id="encryption"
                      checked={securitySettings.encryptionRequired}
                      onCheckedChange={(checked) =>
                        updateSecuritySettings({ encryptionRequired: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Secure Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Link Expiration</Label>
                <input
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={
                    securitySettings.expiryDate?.toISOString().slice(0, 16) ||
                    ''
                  }
                  onChange={(e) =>
                    updateSecuritySettings({
                      expiryDate: e.target.value
                        ? new Date(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed Domains (one per line)</Label>
                <Textarea
                  placeholder="example.com&#10;weddings.org"
                  value={securitySettings.allowedDomains.join('\n')}
                  onChange={(e) =>
                    updateSecuritySettings({
                      allowedDomains: e.target.value
                        .split('\n')
                        .filter((d) => d.trim()),
                    })
                  }
                  rows={3}
                />
                <p className="text-xs text-gray-600">
                  Only users with email addresses from these domains can access
                  the file
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={generateSecureLink} className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Generate Secure Share Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Compliance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Retention Period</Label>
                  <Select
                    value={securitySettings.dataRetentionPeriod.toString()}
                    onValueChange={(value) =>
                      updateSecuritySettings({
                        dataRetentionPeriod: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="365">1 Year</SelectItem>
                      <SelectItem value="1095">3 Years</SelectItem>
                      <SelectItem value="1825">5 Years</SelectItem>
                      <SelectItem value="2555">7 Years (Default)</SelectItem>
                      <SelectItem value="3650">10 Years</SelectItem>
                      <SelectItem value="-1">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    Wedding files are typically retained for 7 years
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>GDPR Compliant</Label>
                      <p className="text-xs text-gray-600">
                        Enable GDPR compliance features
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.gdprCompliant}
                      onCheckedChange={(checked) =>
                        updateSecuritySettings({ gdprCompliant: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Processing Rights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Right to Access
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Right to Rectification
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Right to Erasure
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Data Portability
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Security Violations
                </div>
                <Badge variant="destructive">
                  {violations.filter((v) => !v.resolved).length} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p>No security violations detected</p>
                  <p className="text-sm">
                    Your file security is working properly
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {violations.map((violation) => (
                    <div
                      key={violation.id}
                      className={cn(
                        'p-4 rounded-lg border-l-4',
                        getSeverityColor(violation.severity),
                        violation.resolved && 'opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                violation.resolved ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {violation.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">
                              {violation.type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            {violation.resolved && (
                              <Badge variant="outline" className="text-xs">
                                RESOLVED
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{violation.description}</p>
                          <p className="text-xs text-gray-500">
                            {violation.timestamp.toLocaleString()}
                          </p>
                        </div>
                        {!violation.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveViolation(violation.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4" />
                  <p>No audit logs available</p>
                  <p className="text-sm">Activity will be tracked here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="p-2 bg-white rounded-full">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {log.action.replace(/_/g, ' ').toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          User {log.userId} • {log.timestamp.toLocaleString()}
                        </p>
                        {log.additionalInfo && (
                          <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded">
                            {JSON.stringify(log.additionalInfo, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Functions
async function fetchFileSecuritySettings(
  fileId: string,
): Promise<FileSecuritySettings | null> {
  // Implementation would fetch from your backend API
  return null;
}

async function fetchAuditLogs(fileId: string): Promise<AuditAction[]> {
  // Implementation would fetch audit logs from your backend
  return [];
}

async function fetchSecurityViolations(
  fileId: string,
): Promise<SecurityViolation[]> {
  // Implementation would fetch violations from your security monitoring system
  return [];
}

async function checkComplianceStatus(
  fileId: string,
  settings: FileSecuritySettings,
) {
  return {
    gdpr: settings.gdprCompliant,
    retention: settings.dataRetentionPeriod > 0,
    encryption: settings.encryptionRequired,
    access: settings.accessLevel !== 'public' || settings.requireAuthentication,
  };
}

async function createSecureShareLink(fileId: string, options: any) {
  // Implementation would create a secure, time-limited share link
  return {
    id: 'link-' + crypto.randomUUID(),
    url: `https://secure.wedsync.com/share/${fileId}?token=${crypto.randomUUID()}`,
    expiresAt: options.expiresIn,
  };
}

function getActionIcon(action: string) {
  switch (action) {
    case 'file_viewed':
      return <Eye className="w-4 h-4 text-blue-600" />;
    case 'file_downloaded':
      return <Download className="w-4 h-4 text-green-600" />;
    case 'file_shared':
      return <Share2 className="w-4 h-4 text-purple-600" />;
    case 'security_settings_updated':
      return <Shield className="w-4 h-4 text-orange-600" />;
    case 'access_revoked':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'violation_resolved':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    default:
      return <Zap className="w-4 h-4 text-gray-600" />;
  }
}
