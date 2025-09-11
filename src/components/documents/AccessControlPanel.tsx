'use client';

/**
 * Access Control Panel Component
 * Manages document sharing permissions and secure links
 * WS-068: Wedding Business Compliance Hub
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Link2,
  Eye,
  Download,
  Share2,
  Settings,
  Clock,
  Globe,
  Lock,
  Unlock,
  Copy,
  Check,
  Trash2,
  Edit3,
  Plus,
  Mail,
  Smartphone,
  Calendar,
  Activity,
  AlertTriangle,
  Info,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO, addHours, addDays } from 'date-fns';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  BusinessDocument,
  DocumentSharingLink,
  DocumentAccessControl,
  DocumentSharingLog,
  CreateSharingLinkRequest,
  CreateSharingLinkResponse,
  AccessLevel,
  LinkType,
  AccessControlPanelProps,
} from '@/types/documents';

interface ShareLinkForm {
  link_type: LinkType;
  password: string;
  require_email: boolean;
  allowed_emails: string[];
  max_uses?: number;
  expires_in_hours?: number;
}

export function AccessControlPanel({
  document,
  onUpdateAccess,
  onCreateLink,
}: AccessControlPanelProps) {
  const [sharingLinks, setSharingLinks] = useState<DocumentSharingLink[]>([]);
  const [accessControls, setAccessControls] = useState<DocumentAccessControl[]>(
    [],
  );
  const [sharingLogs, setSharingLogs] = useState<DocumentSharingLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [linkForm, setLinkForm] = useState<ShareLinkForm>({
    link_type: 'view',
    password: '',
    require_email: false,
    allowed_emails: [],
    expires_in_hours: 168, // 7 days default
  });

  const [userForm, setUserForm] = useState({
    email: '',
    access_level: 'view' as AccessLevel,
    expires_in_days: 30,
  });

  useEffect(() => {
    loadAccessData();
  }, [document.id]);

  const loadAccessData = async () => {
    try {
      setLoading(true);
      // TODO: Load actual data from service
      // const [links, controls, logs] = await Promise.all([
      //   documentStorageService.getSharingLinks(document.id),
      //   documentStorageService.getAccessControls(document.id),
      //   documentStorageService.getSharingLogs(document.id)
      // ]);
      // setSharingLinks(links);
      // setAccessControls(controls);
      // setSharingLogs(logs);
    } catch (error) {
      console.error('Failed to load access data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSharingLink = async () => {
    try {
      const request: CreateSharingLinkRequest = {
        document_id: document.id,
        link_type: linkForm.link_type,
        password: linkForm.password || undefined,
        require_email: linkForm.require_email,
        allowed_emails:
          linkForm.allowed_emails.length > 0
            ? linkForm.allowed_emails
            : undefined,
        max_uses: linkForm.max_uses,
        expires_in_hours: linkForm.expires_in_hours,
      };

      const response = await documentStorageService.createSharingLink(
        request,
        'current-user-id', // TODO: Get from auth context
      );

      setSharingLinks((prev) => [...prev, response.link]);
      onCreateLink?.(request);
      setShowCreateLink(false);
      setLinkForm({
        link_type: 'view',
        password: '',
        require_email: false,
        allowed_emails: [],
        expires_in_hours: 168,
      });
    } catch (error) {
      console.error('Failed to create sharing link:', error);
    }
  };

  const handleCopyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(shareUrl);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (confirm('Are you sure you want to delete this sharing link?')) {
      try {
        // TODO: Implement delete link service call
        setSharingLinks((prev) => prev.filter((link) => link.id !== linkId));
      } catch (error) {
        console.error('Failed to delete sharing link:', error);
      }
    }
  };

  const getAccessLevelIcon = (level: AccessLevel) => {
    switch (level) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'share':
        return <Share2 className="w-4 h-4" />;
      case 'manage':
        return <Settings className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getLinkTypeIcon = (type: LinkType) => {
    switch (type) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'preview':
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getSecurityLevel = (link: DocumentSharingLink) => {
    let score = 0;
    if (link.password_hash) score += 2;
    if (link.require_email) score += 1;
    if (link.allowed_emails?.length) score += 2;
    if (link.max_uses) score += 1;
    if (link.expires_at) score += 1;

    if (score >= 5)
      return { level: 'High', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 3)
      return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const formatLinkExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const expiry = parseISO(expiresAt);
    const now = new Date();
    if (expiry < now) return 'Expired';
    return format(expiry, 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Access Control</h3>
          <p className="text-sm text-gray-600">
            Manage who can access "
            {document.title || document.original_filename}"
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowAddUser(true)}>
            <Users className="w-4 h-4 mr-2" />
            Add User
          </Button>

          <Button onClick={() => setShowCreateLink(true)}>
            <Link2 className="w-4 h-4 mr-2" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Security overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sharingLinks.length}
              </div>
              <div className="text-sm text-gray-600">Active Links</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {accessControls.length}
              </div>
              <div className="text-sm text-gray-600">User Access</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sharingLogs.length}
              </div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="links">Sharing Links</TabsTrigger>
          <TabsTrigger value="users">User Access</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Sharing Links */}
        <TabsContent value="links" className="space-y-4">
          {sharingLinks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">
                  No sharing links
                </h3>
                <p className="text-gray-500 mb-4">
                  Create secure links to share this document
                </p>
                <Button onClick={() => setShowCreateLink(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sharingLinks.map((link) => {
                const security = getSecurityLevel(link);
                const shareUrl = `${window.location.origin}/share/${link.link_token}`;

                return (
                  <Card key={link.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {getLinkTypeIcon(link.link_type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium capitalize">
                                {link.link_type} Link
                              </h4>
                              <Badge
                                variant="outline"
                                className={`${security.bg} ${security.color} border-current`}
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                {security.level} Security
                              </Badge>
                              {!link.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center space-x-4">
                                <span>
                                  Created:{' '}
                                  {format(
                                    parseISO(link.created_at),
                                    'MMM dd, yyyy',
                                  )}
                                </span>
                                <span>
                                  Expires: {formatLinkExpiry(link.expires_at)}
                                </span>
                                {link.max_uses && (
                                  <span>
                                    Uses: {link.current_uses}/{link.max_uses}
                                  </span>
                                )}
                              </div>

                              {/* Security features */}
                              <div className="flex items-center space-x-3 text-xs">
                                {link.password_hash && (
                                  <div className="flex items-center space-x-1">
                                    <Lock className="w-3 h-3" />
                                    <span>Password protected</span>
                                  </div>
                                )}
                                {link.require_email && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3" />
                                    <span>Email required</span>
                                  </div>
                                )}
                                {link.allowed_emails?.length && (
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>
                                      {link.allowed_emails.length} allowed
                                      emails
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Share URL */}
                            <div className="mt-3 p-2 bg-gray-50 rounded border flex items-center justify-between">
                              <code className="text-sm text-gray-700 truncate flex-1 mr-2">
                                {shareUrl}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(shareUrl)}
                                className="p-1 h-8 w-8"
                              >
                                {copiedLink === shareUrl ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              /* TODO: Edit link */
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* User Access */}
        <TabsContent value="users" className="space-y-4">
          {accessControls.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">
                  No user access
                </h3>
                <p className="text-gray-500 mb-4">
                  Grant specific users access to this document
                </p>
                <Button onClick={() => setShowAddUser(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First User
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Last Access</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessControls.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                          <span>User {access.user_id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getAccessLevelIcon(access.access_level)}
                          <span className="capitalize">
                            {access.access_level}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(access.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {access.expires_at
                          ? format(parseISO(access.expires_at), 'MMM dd, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {access.last_accessed_at
                          ? format(
                              parseISO(access.last_accessed_at),
                              'MMM dd, HH:mm',
                            )
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity" className="space-y-4">
          {sharingLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">
                  No activity yet
                </h3>
                <p className="text-gray-500">
                  Document access activity will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User/Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharingLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {log.action === 'view' && (
                            <Eye className="w-4 h-4 text-blue-500" />
                          )}
                          {log.action === 'download' && (
                            <Download className="w-4 h-4 text-green-500" />
                          )}
                          {log.action === 'preview' && (
                            <ExternalLink className="w-4 h-4 text-purple-500" />
                          )}
                          <span className="capitalize">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.accessed_by_email || 'Anonymous'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(log.accessed_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200"
                          >
                            Success
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-red-600 border-red-200"
                          >
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sharing Link Dialog */}
      <Dialog open={showCreateLink} onOpenChange={setShowCreateLink}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Sharing Link</DialogTitle>
            <DialogDescription>
              Generate a secure link to share "
              {document.title || document.original_filename}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Link Type */}
            <div>
              <Label className="text-base font-medium">Link Type</Label>
              <Select
                value={linkForm.link_type}
                onValueChange={(value) =>
                  setLinkForm((prev) => ({
                    ...prev,
                    link_type: value as LinkType,
                  }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>
                        View Only - Preview document without downloading
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Download - Allow downloading the document</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="preview">
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4" />
                      <span>Preview - Quick preview in new window</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Security Settings */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Security Settings</Label>

              {/* Password Protection */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Password Protection (Optional)
                </Label>
                <Input
                  type="password"
                  placeholder="Enter password to protect link"
                  value={linkForm.password}
                  onChange={(e) =>
                    setLinkForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Email Requirements */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Require Email Address</Label>
                  <p className="text-xs text-gray-500">
                    Users must provide email to access
                  </p>
                </div>
                <Switch
                  checked={linkForm.require_email}
                  onCheckedChange={(checked) =>
                    setLinkForm((prev) => ({ ...prev, require_email: checked }))
                  }
                />
              </div>

              {/* Allowed Emails */}
              <div className="space-y-2">
                <Label className="text-sm">Allowed Emails (Optional)</Label>
                <Textarea
                  placeholder="Enter email addresses separated by commas"
                  value={linkForm.allowed_emails.join(', ')}
                  onChange={(e) =>
                    setLinkForm((prev) => ({
                      ...prev,
                      allowed_emails: e.target.value
                        .split(',')
                        .map((email) => email.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Max Uses (Optional)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={linkForm.max_uses || ''}
                  onChange={(e) =>
                    setLinkForm((prev) => ({
                      ...prev,
                      max_uses: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>

              <div>
                <Label className="text-sm">Expires In</Label>
                <Select
                  value={linkForm.expires_in_hours?.toString() || ''}
                  onValueChange={(value) =>
                    setLinkForm((prev) => ({
                      ...prev,
                      expires_in_hours: value ? parseInt(value) : undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Never" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Never</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">1 day</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="720">1 month</SelectItem>
                    <SelectItem value="2160">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Security Score */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Security Level:{' '}
                {(() => {
                  let score = 0;
                  if (linkForm.password) score += 2;
                  if (linkForm.require_email) score += 1;
                  if (linkForm.allowed_emails.length > 0) score += 2;
                  if (linkForm.max_uses) score += 1;
                  if (linkForm.expires_in_hours) score += 1;

                  if (score >= 5) return '🟢 High - Very secure link';
                  if (score >= 3) return '🟡 Medium - Moderately secure link';
                  return '🔴 Low - Consider adding more security features';
                })()}
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateLink(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSharingLink}>Create Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant User Access</DialogTitle>
            <DialogDescription>
              Give a specific user access to this document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Access Level</Label>
              <Select
                value={userForm.access_level}
                onValueChange={(value) =>
                  setUserForm((prev) => ({
                    ...prev,
                    access_level: value as AccessLevel,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="download">View & Download</SelectItem>
                  <SelectItem value="share">View, Download & Share</SelectItem>
                  <SelectItem value="manage">Full Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Access Expires In</Label>
              <Select
                value={userForm.expires_in_days.toString()}
                onValueChange={(value) =>
                  setUserForm((prev) => ({
                    ...prev,
                    expires_in_days: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="0">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                /* TODO: Add user */
              }}
            >
              Grant Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
